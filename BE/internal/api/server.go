package api

import (
	"context"
	"fmt"
	"log/slog"
	"net/http"
	"time"

	"erp-backend/db/sqlc"
	"erp-backend/internal/api/handler"
	"erp-backend/internal/api/middleware"
	"erp-backend/internal/config"
	"erp-backend/internal/database"
	"erp-backend/internal/logger"
	"erp-backend/internal/sentryutil"
	"erp-backend/internal/token"

	"github.com/gin-gonic/gin"
)

// Server phục vụ các HTTP request cho hệ thống Car ERP
type Server struct {
	config     *config.Config
	store      db.Store
	tokenMaker token.Maker
	router     *gin.Engine
	pgPool     *database.PostgresPool
	slogger    *slog.Logger
}

// NewServer khởi tạo một HTTP Server mới với Gin Router và đăng ký routes
func NewServer(cfg *config.Config, store db.Store, tokenMaker token.Maker, pgPool *database.PostgresPool) (*Server, error) {
	if cfg.Environment == "production" {
		gin.SetMode(gin.ReleaseMode)
	}

	slogInstance := logger.InitLogger(cfg.Environment)

	server := &Server{
		config:     cfg,
		store:      store,
		tokenMaker: tokenMaker,
		router:     gin.New(),
		pgPool:     pgPool,
		slogger:    slogInstance,
	}

	server.setupRouter()
	return server, nil
}

func (server *Server) setupRouter() {
	// 1. Global Middlewares (CORSMiddleware phải chạy đầu tiên để chặn và phản hồi Preflight OPTIONS)
	server.router.Use(middleware.CORSMiddleware(server.config.CORSAllowedOrigins))
	server.router.Use(logger.StructuredLoggerMiddleware(server.slogger))
	server.router.Use(sentryutil.SentryMiddleware())
	server.router.Use(middleware.SecurityHeadersMiddleware())
	server.router.Use(gin.Recovery())

	// Giới hạn kích thước tối đa của Request Body (10MB) chống DOS
	server.router.Use(func(c *gin.Context) {
		if c.Request.Body != nil {
			c.Request.Body = http.MaxBytesReader(c.Writer, c.Request.Body, 10<<20)
		}
		c.Next()
	})

	// 2. Health check endpoint
	server.router.GET("/health", func(c *gin.Context) {
		pingCtx, pingCancel := context.WithTimeout(c.Request.Context(), 2*time.Second)
		defer pingCancel()

		status := "UP"
		dbStatus := "CONNECTED"
		if server.pgPool != nil {
			if err := server.pgPool.Ping(pingCtx); err != nil {
				status = "DEGRADED"
				dbStatus = fmt.Sprintf("DISCONNECTED: %v", err)
				c.JSON(http.StatusServiceUnavailable, gin.H{
					"status":   status,
					"database": dbStatus,
				})
				return
			}
		}

		var poolStats interface{} = nil
		if server.pgPool != nil {
			stats := server.pgPool.Stats()
			poolStats = gin.H{
				"total_conns":    stats.TotalConns(),
				"idle_conns":     stats.IdleConns(),
				"acquired_conns": stats.AcquiredConns(),
				"max_conns":      stats.MaxConns(),
			}
		}

		c.JSON(http.StatusOK, gin.H{
			"status":      status,
			"database":    dbStatus,
			"timestamp":   time.Now().Format(time.RFC3339),
			"environment": server.config.Environment,
			"pool_stats":  poolStats,
		})
	})

	// Handlers
	authHandler := handler.NewAuthHandler(
		server.store,
		server.tokenMaker,
		server.config.AccessTokenDuration,
		server.config.RefreshTokenDuration,
	)
	branchHandler := handler.NewBranchHandler(server.store)
	vehicleModelHandler := handler.NewVehicleModelHandler(server.store)
	vehicleHandler := handler.NewVehicleHandler(server.store)
	customerHandler := handler.NewCustomerHandler(server.store)
	leadHandler := handler.NewLeadHandler(server.store)
	salesOrderHandler := handler.NewSalesOrderHandler(server.store)
	invoiceHandler := handler.NewInvoiceHandler(server.store)
	repairOrderHandler := handler.NewRepairOrderHandler(server.store)

	// 3. API Routes
	// Root Aliases for Auth (Hỗ trợ cả trường hợp client gọi trực tiếp /auth/*)
	rootAuth := server.router.Group("/auth")
	{
		rootAuth.POST("/login", authHandler.Login)
		rootAuth.POST("/renew", authHandler.RenewAccessToken)
	}

	// API V1 Routes
	v1 := server.router.Group("/api/v1")
	{
		// Public Auth Routes
		authRoutes := v1.Group("/auth")
		{
			authRoutes.POST("/login", authHandler.Login)
			authRoutes.POST("/renew", authHandler.RenewAccessToken)
		}

		// Protected Routes (Yêu cầu JWT Auth + Tenant Enforcement)
		protected := v1.Group("")
		protected.Use(middleware.AuthMiddleware(server.tokenMaker))
		protected.Use(middleware.TenantEnforcementMiddleware())
		{
			// Auth Profile & Logout
			protected.GET("/auth/me", authHandler.GetMe)
			protected.POST("/auth/logout", authHandler.Logout)

			// Branches Management
			branchRoutes := protected.Group("/branches")
			{
				branchRoutes.GET("", branchHandler.ListBranches)
				branchRoutes.GET("/:id", branchHandler.GetBranch)
				branchRoutes.POST("", middleware.RequireRoles("superadmin"), branchHandler.CreateBranch)
			}

			// Vehicle Models (Danh mục dòng xe dùng chung)
			modelRoutes := protected.Group("/vehicle-models")
			{
				modelRoutes.GET("", vehicleModelHandler.ListVehicleModels)
				modelRoutes.GET("/:id", vehicleModelHandler.GetVehicleModel)
				modelRoutes.POST("", middleware.RequireRoles("superadmin"), vehicleModelHandler.CreateVehicleModel)
				modelRoutes.PATCH("/:id", middleware.RequireRoles("superadmin"), vehicleModelHandler.UpdateVehicleModel)
				modelRoutes.DELETE("/:id", middleware.RequireRoles("superadmin"), vehicleModelHandler.DeleteVehicleModel)
			}

			// Vehicles in Stock (Kho xe vật lý chi nhánh bảo vệ bằng RLS)
			vehicleRoutes := protected.Group("/vehicles")
			{
				vehicleRoutes.GET("", vehicleHandler.ListVehicles)
				vehicleRoutes.GET("/:id", vehicleHandler.GetVehicle)
				vehicleRoutes.GET("/vin/:vin", vehicleHandler.GetVehicleByVIN)
				vehicleRoutes.POST("", middleware.RequireRoles("superadmin", "branch_manager"), vehicleHandler.CreateVehicle)
				vehicleRoutes.PATCH("/:id/status", middleware.RequireRoles("superadmin", "branch_manager", "salesperson", "mechanic"), vehicleHandler.UpdateVehicleStatus)
				vehicleRoutes.POST("/:id/transfer", middleware.RequireRoles("superadmin", "branch_manager"), vehicleHandler.TransferVehicle)
			}

			// Customers (Khách hàng CRM cấp tập đoàn dùng chung)
			customerRoutes := protected.Group("/customers")
			{
				customerRoutes.POST("", customerHandler.CreateCustomer)
				customerRoutes.GET("", customerHandler.ListCustomers)
				customerRoutes.GET("/:id", customerHandler.GetCustomer)
				customerRoutes.GET("/phone/:phone", customerHandler.GetCustomerByPhone)
				customerRoutes.PATCH("/:id", customerHandler.UpdateCustomer)
			}

			// Leads (Cơ hội bán hàng bảo vệ bằng RLS chi nhánh)
			leadRoutes := protected.Group("/leads")
			{
				leadRoutes.POST("", leadHandler.CreateLead)
				leadRoutes.GET("", leadHandler.ListLeads)
				leadRoutes.GET("/:id", leadHandler.GetLead)
				leadRoutes.PATCH("/:id/status", leadHandler.UpdateLeadStatus)
				leadRoutes.PATCH("/:id/assign", middleware.RequireRoles("superadmin", "branch_manager"), leadHandler.AssignLead)
			}

			// Sales Orders (Đơn bán xe bảo vệ bằng RLS chi nhánh + Khóa chống Race Condition)
			orderRoutes := protected.Group("/sales-orders")
			{
				orderRoutes.POST("", salesOrderHandler.CreateSalesOrder)
				orderRoutes.GET("", salesOrderHandler.ListSalesOrders)
				orderRoutes.GET("/:id", salesOrderHandler.GetSalesOrder)
				orderRoutes.PATCH("/:id/status", salesOrderHandler.UpdateSalesOrderStatus)
				orderRoutes.POST("/:id/cancel", salesOrderHandler.CancelSalesOrder)
			}

			// Invoices (Quản lý hóa đơn thu tiền theo chi nhánh)
			invoiceRoutes := protected.Group("/invoices")
			{
				invoiceRoutes.POST("", invoiceHandler.CreateInvoice)
				invoiceRoutes.GET("", invoiceHandler.ListInvoices)
				invoiceRoutes.GET("/:id", invoiceHandler.GetInvoice)
				invoiceRoutes.POST("/:id/payments", invoiceHandler.CreatePaymentForInvoice)
			}

			// Transactions (Nhật ký dòng tiền thanh toán thực tế)
			transactionRoutes := protected.Group("/transactions")
			{
				transactionRoutes.GET("", invoiceHandler.ListTransactions)
			}

			// Repair Orders (Lệnh sửa chữa & Dịch vụ sau bán hàng)
			repairRoutes := protected.Group("/repair-orders")
			{
				repairRoutes.POST("", repairOrderHandler.CreateRepairOrder)
				repairRoutes.GET("", repairOrderHandler.ListRepairOrders)
				repairRoutes.GET("/:id", repairOrderHandler.GetRepairOrder)
				repairRoutes.GET("/vehicle/:vehicle_id/history", repairOrderHandler.GetVehicleServiceHistory)
				repairRoutes.PATCH("/:id/status", repairOrderHandler.UpdateRepairOrderStatus)
				repairRoutes.PATCH("/:id/assign-mechanic", middleware.RequireRoles("superadmin", "branch_manager"), repairOrderHandler.AssignMechanic)
				repairRoutes.POST("/:id/items", repairOrderHandler.AddItem)
				repairRoutes.DELETE("/:id/items/:item_id", repairOrderHandler.DeleteItem)
				repairRoutes.POST("/:id/invoice", repairOrderHandler.CreateInvoiceForRepairOrder)
			}
		}
	}
}

// Router trả về gin.Engine phục vụ cho việc testing
func (server *Server) Router() *gin.Engine {
	return server.router
}

// Start khởi chạy HTTP server lắng nghe kết nối
func (server *Server) Start(address string) error {
	return server.router.Run(address)
}
