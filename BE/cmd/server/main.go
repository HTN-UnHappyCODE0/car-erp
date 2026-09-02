package main

import (
	"context"
	"errors"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"erp-backend/db/sqlc"
	"erp-backend/internal/api"
	"erp-backend/internal/config"
	"erp-backend/internal/database"
	"erp-backend/internal/sentryutil"
	"erp-backend/internal/token"
)

func main() {
	// 1. Tải cấu hình hệ thống
	cfg := config.LoadConfig()
	log.Printf("[Server] Khởi động hệ thống Car ERP Backend (Môi trường: %s)...", cfg.Environment)

	// 1.1 Khởi tạo Sentry giám sát lỗi
	if _, err := sentryutil.InitSentry(cfg.Sentry); err != nil {
		log.Printf("[Server] Cảnh báo: %v", err)
	}
	defer sentryutil.Flush(2 * time.Second)

	// 2. Khởi tạo PostgreSQL Connection Pool (pgxpool)
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	pgPool, err := database.NewPostgresPool(ctx, cfg.Database)
	if err != nil {
		log.Fatalf("[Server] Không thể kết nối cơ sở dữ liệu: %v", err)
	}
	defer pgPool.Close()

	// 3. Khởi tạo Store Layer (kết hợp sqlc + Transaction ExecTx)
	store := db.NewStore(pgPool.Pool)

	// 4. Khởi tạo Token Maker (JWT)
	tokenMaker, err := token.NewJWTMaker(cfg.TokenSymmetricKey)
	if err != nil {
		log.Fatalf("[Server] Không thể khởi tạo JWT Token Maker: %v", err)
	}

	// 5. Khởi tạo Gin Server
	server, err := api.NewServer(cfg, store, tokenMaker, pgPool)
	if err != nil {
		log.Fatalf("[Server] Không thể tạo HTTP Server: %v", err)
	}

	httpServer := &http.Server{
		Addr:         ":" + cfg.ServerPort,
		Handler:      server.Router(),
		ReadTimeout:  10 * time.Second,
		WriteTimeout: 10 * time.Second,
		IdleTimeout:  60 * time.Second,
	}

	// 6. Chạy HTTP Server trong Goroutine riêng
	go func() {
		log.Printf("[Server] HTTP Server đang lắng nghe tại cổng :%s", cfg.ServerPort)
		if err := httpServer.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
			log.Fatalf("[Server] HTTP server gặp lỗi: %v", err)
		}
	}()

	// 7. Lắng nghe tín hiệu Graceful Shutdown từ hệ điều hành (SIGINT, SIGTERM)
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, os.Interrupt, syscall.SIGTERM)
	<-quit

	log.Println("[Server] Nhận được tín hiệu dừng hệ thống, bắt đầu tiến trình Graceful Shutdown...")

	shutdownCtx, shutdownCancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer shutdownCancel()

	if err := httpServer.Shutdown(shutdownCtx); err != nil {
		log.Printf("[Server] Lỗi khi đóng HTTP Server: %v", err)
	}

	// pgPool.Close() sẽ được gọi tự động qua defer
	log.Println("[Server] Toàn bộ dịch vụ đã được dừng an toàn.")
}
