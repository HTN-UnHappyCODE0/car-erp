package handler

import (
	"errors"
	"fmt"
	"net/http"

	"erp-backend/db/sqlc"
	"erp-backend/internal/api/httperr"
	"erp-backend/internal/api/middleware"
	"erp-backend/internal/api/response"
	"erp-backend/internal/domain"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgtype"
)

type SalesOrderHandler struct {
	store db.Store
}

func NewSalesOrderHandler(store db.Store) *SalesOrderHandler {
	return &SalesOrderHandler{
		store: store,
	}
}

type createSalesOrderRequest struct {
	CustomerID     string  `json:"customer_id" binding:"required,uuid"`
	VehicleID      string  `json:"vehicle_id" binding:"required,uuid"`
	TotalAmount    string  `json:"total_amount" binding:"required"`
	DiscountAmount *string `json:"discount_amount"`
	DepositAmount  *string `json:"deposit_amount"`
	LeadID         *string `json:"lead_id" binding:"omitempty,uuid"`
}

// CreateSalesOrder lên đơn bán xe với khóa bi quan (SELECT FOR UPDATE) chống race condition và snapshot giá bất biến
func (h *SalesOrderHandler) CreateSalesOrder(c *gin.Context) {
	var req createSalesOrderRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, "Dữ liệu tạo đơn hàng không hợp lệ", err.Error())
		return
	}

	payload, _ := middleware.GetAuthPayload(c)
	branchID := payload.BranchID
	salespersonID := payload.EmployeeID
	if salespersonID == uuid.Nil {
		salespersonID = payload.UserID
	}

	if branchID == uuid.Nil {
		response.BadRequest(c, "Yêu cầu ngữ cảnh chi nhánh hợp lệ để lên đơn hàng", nil)
		return
	}

	customerID, _ := uuid.Parse(req.CustomerID)
	vehicleID, _ := uuid.Parse(req.VehicleID)

	var totalAmount, discountAmount, depositAmount pgtype.Numeric
	if err := totalAmount.Scan(req.TotalAmount); err != nil {
		response.BadRequest(c, "Tổng giá trị đơn hàng không hợp lệ", err.Error())
		return
	}

	discStr := "0.00"
	if req.DiscountAmount != nil && *req.DiscountAmount != "" {
		discStr = *req.DiscountAmount
	}
	_ = discountAmount.Scan(discStr)

	depStr := "0.00"
	if req.DepositAmount != nil && *req.DepositAmount != "" {
		depStr = *req.DepositAmount
	}
	_ = depositAmount.Scan(depStr)

	initialStatus := domain.OrderStatusDraft
	if req.DepositAmount != nil && *req.DepositAmount != "0" && *req.DepositAmount != "0.00" {
		initialStatus = domain.OrderStatusDepositPaid
	}

	var createdOrder db.SalesOrder

	// Khởi tạo ACID Transaction với Khóa chống Bán trùng số VIN
	err := h.store.ExecTx(c.Request.Context(), func(q *db.Queries) error {
		// 1. Khóa bi quan chiếc xe (Pessimistic Lock: SELECT ... FOR UPDATE)
		vehicle, err := q.GetVehicleForUpdate(c.Request.Context(), vehicleID)
		if err != nil {
			return fmt.Errorf("không thể tìm thấy xe hoặc xe không thuộc chi nhánh: %w", err)
		}

		// 2. Kiểm tra xe có ở trạng thái sẵn sàng bán không
		if vehicle.Status != domain.VehicleStatusInStock {
			return fmt.Errorf("xe có số VIN [%s] hiện không ở trạng thái sẵn sàng bán (trạng thái hiện tại: %s)", vehicle.Vin, vehicle.Status)
		}

		// 3. Snapshot giá và chèn bản ghi đơn hàng
		arg := db.CreateSalesOrderParams{
			BranchID:       branchID,
			CustomerID:     customerID,
			SalespersonID:  salespersonID,
			VehicleID:      vehicleID,
			TotalAmount:    totalAmount,
			DiscountAmount: discountAmount,
			DepositAmount:  depositAmount,
			Status:         initialStatus,
		}

		createdOrder, err = q.CreateSalesOrder(c.Request.Context(), arg)
		if err != nil {
			return err
		}

		// 4. Khóa xe sang trạng thái RESERVED (Đã giữ chỗ / Đã lên đơn)
		_, err = q.UpdateVehicleStatus(c.Request.Context(), db.UpdateVehicleStatusParams{
			ID:     vehicleID,
			Status: domain.VehicleStatusReserved,
		})
		if err != nil {
			return fmt.Errorf("không thể cập nhật trạng thái xe sang RESERVED: %w", err)
		}

		// 5. Nếu đơn hàng sinh ra từ Lead, cập nhật Lead sang trạng thái WON (Thành công)
		if req.LeadID != nil && *req.LeadID != "" {
			leadID, _ := uuid.Parse(*req.LeadID)
			_, _ = q.UpdateLeadStatus(c.Request.Context(), db.UpdateLeadStatusParams{
				ID:     leadID,
				Status: domain.LeadStatusWon,
			})
		}

		return nil
	})

	if err != nil {
		httperr.HandleDBError(c, err, "Đơn bán xe")
		return
	}

	response.Success(c, http.StatusCreated, createdOrder, "Lên đơn bán xe thành công")
}

type getSalesOrderRequest struct {
	ID string `uri:"id" binding:"required,uuid"`
}

// GetSalesOrder xem chi tiết đơn bán xe
func (h *SalesOrderHandler) GetSalesOrder(c *gin.Context) {
	var req getSalesOrderRequest
	if err := c.ShouldBindUri(&req); err != nil {
		response.BadRequest(c, "ID đơn hàng không hợp lệ", err.Error())
		return
	}

	orderID, _ := uuid.Parse(req.ID)
	var order db.SalesOrder

	err := h.store.ExecTx(c.Request.Context(), func(q *db.Queries) error {
		var err error
		order, err = q.GetSalesOrder(c.Request.Context(), orderID)
		return err
	})

	if err != nil {
		httperr.HandleDBError(c, err, "Đơn bán xe")
		return
	}

	response.Success(c, http.StatusOK, order, "Lấy thông tin đơn bán xe thành công")
}

type listSalesOrdersRequest struct {
	PageID        int32   `form:"page_id" binding:"omitempty,min=1"`
	PageSize      int32   `form:"page_size" binding:"omitempty,min=5,max=100"`
	Status        *string `form:"status" binding:"omitempty,oneof=DRAFT DEPOSIT_PAID FULL_PAID DELIVERED CANCELLED"`
	SalespersonID *string `form:"salesperson_id" binding:"omitempty,uuid"`
}

// ListSalesOrders lấy danh sách đơn bán xe của chi nhánh (RLS tự động lọc)
func (h *SalesOrderHandler) ListSalesOrders(c *gin.Context) {
	var req listSalesOrdersRequest
	if err := c.ShouldBindQuery(&req); err != nil {
		response.BadRequest(c, "Tham số truy vấn danh sách đơn hàng không hợp lệ", err.Error())
		return
	}

	if req.PageID == 0 {
		req.PageID = 1
	}
	if req.PageSize == 0 {
		req.PageSize = 10
	}

	offset := (req.PageID - 1) * req.PageSize
	var orders []db.SalesOrder

	err := h.store.ExecTx(c.Request.Context(), func(q *db.Queries) error {
		var err error
		if req.Status != nil && *req.Status != "" {
			orders, err = q.ListSalesOrdersByStatus(c.Request.Context(), db.ListSalesOrdersByStatusParams{
				Status: *req.Status,
				Limit:  req.PageSize,
				Offset: offset,
			})
		} else if req.SalespersonID != nil && *req.SalespersonID != "" {
			salesID, _ := uuid.Parse(*req.SalespersonID)
			orders, err = q.ListSalesOrdersBySalesperson(c.Request.Context(), db.ListSalesOrdersBySalespersonParams{
				SalespersonID: salesID,
				Limit:         req.PageSize,
				Offset:        offset,
			})
		} else {
			orders, err = q.ListSalesOrders(c.Request.Context(), db.ListSalesOrdersParams{
				Limit:  req.PageSize,
				Offset: offset,
			})
		}
		return err
	})

	if err != nil {
		httperr.HandleDBError(c, err, "Danh sách đơn bán xe")
		return
	}

	response.Success(c, http.StatusOK, orders, "Lấy danh sách đơn bán xe thành công")
}

type updateSalesOrderStatusRequest struct {
	Status        string  `json:"status" binding:"required,oneof=DEPOSIT_PAID FULL_PAID DELIVERED"`
	DepositAmount *string `json:"deposit_amount"`
}

// UpdateSalesOrderStatus chuyển trạng thái đơn hàng theo State Machine và cập nhật kho xe tự động
func (h *SalesOrderHandler) UpdateSalesOrderStatus(c *gin.Context) {
	var uriReq getSalesOrderRequest
	if err := c.ShouldBindUri(&uriReq); err != nil {
		response.BadRequest(c, "ID đơn hàng không hợp lệ", err.Error())
		return
	}

	var req updateSalesOrderStatusRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, "Trạng thái cập nhật không hợp lệ", err.Error())
		return
	}

	orderID, _ := uuid.Parse(uriReq.ID)
	var updatedOrder db.SalesOrder

	err := h.store.ExecTx(c.Request.Context(), func(q *db.Queries) error {
		// 1. Khóa bi quan đơn hàng để kiểm tra trạng thái hiện tại
		order, err := q.GetSalesOrderForUpdate(c.Request.Context(), orderID)
		if err != nil {
			return err
		}

		// 2. Kiểm tra tính hợp lệ của bước chuyển trạng thái (State Machine)
		if err := domain.ValidateOrderTransition(order.Status, req.Status); err != nil {
			return err
		}

		// 3. Xử lý đồng bộ trạng thái xe tương ứng
		if newVehicleStatus, shouldUpdateVehicle := domain.GetVehicleStatusForOrderTransition(req.Status); shouldUpdateVehicle {
			_, err = q.UpdateVehicleStatus(c.Request.Context(), db.UpdateVehicleStatusParams{
				ID:     order.VehicleID,
				Status: newVehicleStatus,
			})
			if err != nil {
				return fmt.Errorf("không thể cập nhật trạng thái kho xe sang %s: %w", newVehicleStatus, err)
			}
		}

		// 4. Cập nhật trạng thái đơn hàng (và tiền cọc nếu có)
		if req.DepositAmount != nil && *req.DepositAmount != "" {
			var dep pgtype.Numeric
			if scanErr := dep.Scan(*req.DepositAmount); scanErr != nil {
				return errors.New("số tiền đặt cọc không hợp lệ")
			}
			updatedOrder, err = q.UpdateSalesOrderDeposit(c.Request.Context(), db.UpdateSalesOrderDepositParams{
				ID:            orderID,
				DepositAmount: dep,
				Status:        req.Status,
			})
		} else {
			updatedOrder, err = q.UpdateSalesOrderStatus(c.Request.Context(), db.UpdateSalesOrderStatusParams{
				ID:     orderID,
				Status: req.Status,
			})
		}

		return err
	})

	if err != nil {
		httperr.HandleDBError(c, err, "Đơn bán xe")
		return
	}

	response.Success(c, http.StatusOK, updatedOrder, "Cập nhật trạng thái đơn bán xe thành công")
}

type cancelSalesOrderRequest struct {
	CancelReason      string `json:"cancel_reason" binding:"required,min=5"`
	DepositResolution string `json:"deposit_resolution" binding:"required,oneof=NONE FORFEITED PENDING_REFUND CREDITED"`
}

// CancelSalesOrder hủy đơn hàng với đầy đủ lý do, hướng giải quyết cọc và lưu vết người thao tác (cancelled_by)
func (h *SalesOrderHandler) CancelSalesOrder(c *gin.Context) {
	var uriReq getSalesOrderRequest
	if err := c.ShouldBindUri(&uriReq); err != nil {
		response.BadRequest(c, "ID đơn hàng không hợp lệ", err.Error())
		return
	}

	var req cancelSalesOrderRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, "Dữ liệu hủy đơn không hợp lệ", err.Error())
		return
	}

	payload, ok := middleware.GetAuthPayload(c)
	if !ok || payload == nil {
		response.Unauthorized(c, "Yêu cầu đăng nhập")
		return
	}

	cancelledBy := payload.EmployeeID
	if cancelledBy == uuid.Nil {
		cancelledBy = payload.UserID
	}

	orderID, _ := uuid.Parse(uriReq.ID)
	var cancelledOrder db.SalesOrder

	err := h.store.ExecTx(c.Request.Context(), func(q *db.Queries) error {
		// 1. Khóa bi quan đơn hàng để kiểm tra tính hợp lệ
		order, err := q.GetSalesOrderForUpdate(c.Request.Context(), orderID)
		if err != nil {
			return err
		}

		// 2. Kiểm tra số tiền cọc đã phát sinh
		hasDeposit := false
		if order.DepositAmount.Valid {
			// Kiểm tra nếu deposit > 0
			if order.Status == domain.OrderStatusDepositPaid || order.Status == domain.OrderStatusFullPaid {
				hasDeposit = true
			}
		}

		// 3. Kiểm tra tính hợp lệ của việc hủy và hướng giải quyết cọc
		if err := domain.ValidateCancellation(order.Status, hasDeposit, req.DepositResolution, req.CancelReason); err != nil {
			return err
		}

		// 4. Hủy đơn hàng và lưu vết cancelled_by, cancel_reason, deposit_resolution
		cancelledOrder, err = q.CancelSalesOrder(c.Request.Context(), db.CancelSalesOrderParams{
			ID:                orderID,
			CancelReason:      pgtype.Text{String: req.CancelReason, Valid: true},
			DepositResolution: pgtype.Text{String: req.DepositResolution, Valid: true},
			CancelledBy:       pgtype.UUID{Bytes: cancelledBy, Valid: true},
		})
		if err != nil {
			return fmt.Errorf("không thể cập nhật hủy đơn hàng: %w", err)
		}

		// 5. Ngay lập tức mở khóa chiếc xe từ RESERVED về lại IN_STOCK để nhân viên khác chào bán
		_, err = q.UpdateVehicleStatus(c.Request.Context(), db.UpdateVehicleStatusParams{
			ID:     order.VehicleID,
			Status: domain.VehicleStatusInStock,
		})
		if err != nil {
			return fmt.Errorf("không thể mở khóa xe về IN_STOCK: %w", err)
		}

		return nil
	})

	if err != nil {
		httperr.HandleDBError(c, err, "Hủy đơn bán xe")
		return
	}

	response.Success(c, http.StatusOK, cancelledOrder, "Hủy đơn hàng và mở khóa xe thành công")
}
