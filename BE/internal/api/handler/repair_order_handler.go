package handler

import (
	"fmt"
	"net/http"
	"time"

	"erp-backend/db/sqlc"
	"erp-backend/internal/api/httperr"
	"erp-backend/internal/api/middleware"
	"erp-backend/internal/api/response"
	"erp-backend/internal/domain"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgtype"
	"github.com/shopspring/decimal"
)

type RepairOrderHandler struct {
	store db.Store
}

func NewRepairOrderHandler(store db.Store) *RepairOrderHandler {
	return &RepairOrderHandler{
		store: store,
	}
}

type createRepairOrderRequest struct {
	CustomerID       string  `json:"customer_id" binding:"required,uuid"`
	VehicleID        string  `json:"vehicle_id" binding:"required,uuid"`
	MechanicID       *string `json:"mechanic_id" binding:"omitempty,uuid"`
	Odometer         int32   `json:"odometer" binding:"required,gt=0"`
	Symptoms         string  `json:"symptoms" binding:"required,min=3"`
	Diagnosis        *string `json:"diagnosis"`
	OverrideOdometer bool    `json:"override_odometer"`
	OverrideReason   string  `json:"override_reason"`
}

// CreateRepairOrder tiếp nhận xe và mở lệnh sửa chữa mới với kiểm soát ODO
func (h *RepairOrderHandler) CreateRepairOrder(c *gin.Context) {
	var req createRepairOrderRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, "Dữ liệu tạo lệnh sửa chữa không hợp lệ", err.Error())
		return
	}

	payload, _ := middleware.GetAuthPayload(c)
	branchID := payload.BranchID
	if branchID == uuid.Nil {
		response.BadRequest(c, "Yêu cầu ngữ cảnh chi nhánh hợp lệ để tạo lệnh sửa chữa", nil)
		return
	}

	serviceAdvisorID := payload.EmployeeID
	if serviceAdvisorID == uuid.Nil {
		serviceAdvisorID = payload.UserID
	}

	customerID, _ := uuid.Parse(req.CustomerID)
	vehicleID, _ := uuid.Parse(req.VehicleID)

	var createdOrder db.RepairOrder
	err := h.store.ExecTx(c.Request.Context(), func(q *db.Queries) error {
		// 1. Kiểm tra số Odometer của lần tiếp nhận gần nhất
		latestOdo, err := q.GetLatestOdometerForVehicle(c.Request.Context(), vehicleID)
		if err == nil {
			if err := domain.ValidateOdometer(latestOdo, req.Odometer, req.OverrideOdometer, req.OverrideReason, payload.Role); err != nil {
				return err
			}
		} else {
			if req.Odometer <= 0 {
				return domain.NewValidationError("số Kilomet (odometer) phải lớn hơn 0")
			}
		}

		// 2. Chuẩn bị dữ liệu
		var mechanicUUID pgtype.UUID
		if req.MechanicID != nil && *req.MechanicID != "" {
			mID, _ := uuid.Parse(*req.MechanicID)
			mechanicUUID = pgtype.UUID{Bytes: mID, Valid: true}
		}

		diagnosisText := pgtype.Text{}
		if req.Diagnosis != nil {
			diagnosisText = pgtype.Text{String: *req.Diagnosis, Valid: true}
		}

		overrideText := pgtype.Text{}
		if req.OverrideOdometer && req.OverrideReason != "" {
			overrideText = pgtype.Text{String: req.OverrideReason, Valid: true}
		}

		var initialCost pgtype.Numeric
		_ = initialCost.Scan("0.00")

		createdOrder, err = q.CreateRepairOrder(c.Request.Context(), db.CreateRepairOrderParams{
			BranchID:               branchID,
			CustomerID:             customerID,
			VehicleID:              vehicleID,
			ServiceAdvisorID:       serviceAdvisorID,
			MechanicID:             mechanicUUID,
			Odometer:               req.Odometer,
			Symptoms:               pgtype.Text{String: req.Symptoms, Valid: true},
			Diagnosis:              diagnosisText,
			TotalCost:              initialCost,
			Status:                 domain.RepairOrderStatusOpen,
			OdometerOverrideReason: overrideText,
		})

		return err
	})

	if err != nil {
		httperr.HandleDBError(c, err, "Lệnh sửa chữa")
		return
	}

	response.Success(c, http.StatusCreated, createdOrder, "Tiếp nhận xe và tạo lệnh sửa chữa thành công")
}

type getRepairOrderRequest struct {
	ID string `uri:"id" binding:"required,uuid"`
}

type repairOrderDetailResponse struct {
	db.RepairOrder
	Items []db.RepairOrderItem `json:"items"`
}

// GetRepairOrder xem chi tiết lệnh sửa chữa kèm toàn bộ danh sách phụ tùng & công thợ
func (h *RepairOrderHandler) GetRepairOrder(c *gin.Context) {
	var req getRepairOrderRequest
	if err := c.ShouldBindUri(&req); err != nil {
		response.BadRequest(c, "ID lệnh sửa chữa không hợp lệ", err.Error())
		return
	}

	orderID, _ := uuid.Parse(req.ID)
	var order db.RepairOrder
	var items []db.RepairOrderItem

	err := h.store.ExecTx(c.Request.Context(), func(q *db.Queries) error {
		var err error
		order, err = q.GetRepairOrder(c.Request.Context(), orderID)
		if err != nil {
			return err
		}

		items, err = q.ListRepairOrderItemsByOrder(c.Request.Context(), orderID)
		return err
	})

	if err != nil {
		httperr.HandleDBError(c, err, "Lệnh sửa chữa")
		return
	}

	res := repairOrderDetailResponse{
		RepairOrder: order,
		Items:       items,
	}

	response.Success(c, http.StatusOK, res, "Lấy thông tin lệnh sửa chữa thành công")
}

type listRepairOrdersRequest struct {
	PageID    int32   `form:"page_id" binding:"omitempty,min=1"`
	PageSize  int32   `form:"page_size" binding:"omitempty,min=5,max=100"`
	Status    *string `form:"status" binding:"omitempty,oneof=OPEN IN_PROGRESS COMPLETED INVOICED"`
	VehicleID *string `form:"vehicle_id" binding:"omitempty,uuid"`
}

// ListRepairOrders lấy danh sách lệnh sửa chữa (RLS chi nhánh)
func (h *RepairOrderHandler) ListRepairOrders(c *gin.Context) {
	var req listRepairOrdersRequest
	if err := c.ShouldBindQuery(&req); err != nil {
		response.BadRequest(c, "Tham số truy vấn danh sách lệnh sửa chữa không hợp lệ", err.Error())
		return
	}

	if req.PageID == 0 {
		req.PageID = 1
	}
	if req.PageSize == 0 {
		req.PageSize = 10
	}

	offset := (req.PageID - 1) * req.PageSize
	var orders []db.RepairOrder

	err := h.store.ExecTx(c.Request.Context(), func(q *db.Queries) error {
		var err error
		if req.VehicleID != nil && *req.VehicleID != "" {
			vID, _ := uuid.Parse(*req.VehicleID)
			orders, err = q.ListRepairOrdersByVehicle(c.Request.Context(), db.ListRepairOrdersByVehicleParams{
				VehicleID: vID,
				Limit:     req.PageSize,
				Offset:    offset,
			})
		} else if req.Status != nil && *req.Status != "" {
			orders, err = q.ListRepairOrdersByStatus(c.Request.Context(), db.ListRepairOrdersByStatusParams{
				Status: *req.Status,
				Limit:  req.PageSize,
				Offset: offset,
			})
		} else {
			orders, err = q.ListRepairOrders(c.Request.Context(), db.ListRepairOrdersParams{
				Limit:  req.PageSize,
				Offset: offset,
			})
		}
		return err
	})

	if err != nil {
		httperr.HandleDBError(c, err, "Danh sách lệnh sửa chữa")
		return
	}

	response.Success(c, http.StatusOK, orders, "Lấy danh sách lệnh sửa chữa thành công")
}

type getVehicleHistoryRequest struct {
	VehicleID string `uri:"vehicle_id" binding:"required,uuid"`
}

// GetVehicleServiceHistory xem toàn bộ lịch sử bảo dưỡng / sửa chữa của xe (phục vụ AI & kỹ thuật)
func (h *RepairOrderHandler) GetVehicleServiceHistory(c *gin.Context) {
	var req getVehicleHistoryRequest
	if err := c.ShouldBindUri(&req); err != nil {
		response.BadRequest(c, "ID xe không hợp lệ", err.Error())
		return
	}

	vehicleID, _ := uuid.Parse(req.VehicleID)
	var orders []db.RepairOrder

	err := h.store.ExecTx(c.Request.Context(), func(q *db.Queries) error {
		var err error
		orders, err = q.ListRepairOrdersByVehicle(c.Request.Context(), db.ListRepairOrdersByVehicleParams{
			VehicleID: vehicleID,
			Limit:     100,
			Offset:    0,
		})
		return err
	})

	if err != nil {
		httperr.HandleDBError(c, err, "Lịch sử bảo dưỡng xe")
		return
	}

	response.Success(c, http.StatusOK, orders, "Lấy lịch sử bảo dưỡng của xe thành công")
}

type updateRepairOrderStatusRequest struct {
	Status    string  `json:"status" binding:"required,oneof=OPEN IN_PROGRESS COMPLETED INVOICED"`
	Diagnosis *string `json:"diagnosis"`
}

// UpdateRepairOrderStatus chuyển trạng thái lệnh sửa chữa theo State Machine
func (h *RepairOrderHandler) UpdateRepairOrderStatus(c *gin.Context) {
	var uriReq getRepairOrderRequest
	if err := c.ShouldBindUri(&uriReq); err != nil {
		response.BadRequest(c, "ID lệnh sửa chữa không hợp lệ", err.Error())
		return
	}

	var req updateRepairOrderStatusRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, "Trạng thái cập nhật không hợp lệ", err.Error())
		return
	}

	orderID, _ := uuid.Parse(uriReq.ID)
	var updatedOrder db.RepairOrder

	err := h.store.ExecTx(c.Request.Context(), func(q *db.Queries) error {
		// 1. Khóa bi quan lệnh sửa chữa
		order, err := q.GetRepairOrderForUpdate(c.Request.Context(), orderID)
		if err != nil {
			return err
		}

		// 2. Kiểm tra tính hợp lệ của State Machine
		if err := domain.ValidateServiceTransition(order.Status, req.Status); err != nil {
			return err
		}

		// 3. Nếu chuyển sang COMPLETED: Bắt buộc phải có ít nhất 1 vật tư/công thợ và total_cost > 0
		if req.Status == domain.RepairOrderStatusCompleted {
			items, err := q.ListRepairOrderItemsByOrder(c.Request.Context(), orderID)
			if err != nil || len(items) == 0 {
				return domain.NewValidationError("không thể hoàn tất lệnh sửa chữa khi chưa có bất kỳ hạng mục vật tư (PART) hoặc tiền công (LABOR) nào")
			}

			costDec := numericToDecimal(order.TotalCost)
			if costDec.LessThanOrEqual(decimal.Zero) {
				return domain.NewValidationError("tổng chi phí sửa chữa (total_cost) phải lớn hơn 0 trước khi nghiệm thu hoàn tất")
			}
		}

		diagnosisText := pgtype.Text{}
		if req.Diagnosis != nil {
			diagnosisText = pgtype.Text{String: *req.Diagnosis, Valid: true}
		}

		updatedOrder, err = q.UpdateRepairOrderStatus(c.Request.Context(), db.UpdateRepairOrderStatusParams{
			ID:        orderID,
			Status:    req.Status,
			Diagnosis: diagnosisText,
		})

		return err
	})

	if err != nil {
		httperr.HandleDBError(c, err, "Lệnh sửa chữa")
		return
	}

	response.Success(c, http.StatusOK, updatedOrder, "Cập nhật trạng thái lệnh sửa chữa thành công")
}

type assignMechanicRequest struct {
	MechanicID string `json:"mechanic_id" binding:"required,uuid"`
}

// AssignMechanic phân công hoặc đổi kỹ thuật viên chính
func (h *RepairOrderHandler) AssignMechanic(c *gin.Context) {
	var uriReq getRepairOrderRequest
	if err := c.ShouldBindUri(&uriReq); err != nil {
		response.BadRequest(c, "ID lệnh sửa chữa không hợp lệ", err.Error())
		return
	}

	var req assignMechanicRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, "ID kỹ thuật viên không hợp lệ", err.Error())
		return
	}

	orderID, _ := uuid.Parse(uriReq.ID)
	mechanicID, _ := uuid.Parse(req.MechanicID)

	var updatedOrder db.RepairOrder
	err := h.store.ExecTx(c.Request.Context(), func(q *db.Queries) error {
		var err error
		updatedOrder, err = q.AssignMechanic(c.Request.Context(), db.AssignMechanicParams{
			ID:         orderID,
			MechanicID: pgtype.UUID{Bytes: mechanicID, Valid: true},
		})
		return err
	})

	if err != nil {
		httperr.HandleDBError(c, err, "Phân công kỹ thuật viên")
		return
	}

	response.Success(c, http.StatusOK, updatedOrder, "Phân công kỹ thuật viên thành công")
}

type addItemRequest struct {
	ItemType  string  `json:"item_type" binding:"required,oneof=PART LABOR"`
	ItemName  string  `json:"item_name" binding:"required,min=2"`
	Quantity  int32   `json:"quantity" binding:"required,gt=0"`
	UnitPrice string  `json:"unit_price" binding:"required"`
	PartID    *string `json:"part_id" binding:"omitempty,uuid"`
}

// AddItem thêm linh kiện phụ tùng (PART) hoặc tiền công (LABOR) và tính lại total_cost nguyên tử dưới DB
func (h *RepairOrderHandler) AddItem(c *gin.Context) {
	var uriReq getRepairOrderRequest
	if err := c.ShouldBindUri(&uriReq); err != nil {
		response.BadRequest(c, "ID lệnh sửa chữa không hợp lệ", err.Error())
		return
	}

	var req addItemRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, "Dữ liệu hạng mục vật tư không hợp lệ", err.Error())
		return
	}

	var unitPrice pgtype.Numeric
	if err := unitPrice.Scan(req.UnitPrice); err != nil {
		response.BadRequest(c, "Đơn giá không hợp lệ", err.Error())
		return
	}

	orderID, _ := uuid.Parse(uriReq.ID)
	var createdItem db.RepairOrderItem
	var updatedOrder db.RepairOrder

	err := h.store.ExecTx(c.Request.Context(), func(q *db.Queries) error {
		// 1. Khóa bi quan lệnh sửa chữa để chống Race Condition khi nhiều thợ cùng thêm item
		order, err := q.GetRepairOrderForUpdate(c.Request.Context(), orderID)
		if err != nil {
			return err
		}

		// 2. Kiểm tra tính hợp lệ (chỉ được thêm khi OPEN hoặc IN_PROGRESS)
		if err := domain.ValidateItemModification(order.Status); err != nil {
			return err
		}

		// 3. Chuẩn bị part_id nếu có
		var partUUID pgtype.UUID
		if req.PartID != nil && *req.PartID != "" {
			pID, _ := uuid.Parse(*req.PartID)
			partUUID = pgtype.UUID{Bytes: pID, Valid: true}
		}

		// 4. Thêm item mới
		createdItem, err = q.CreateRepairOrderItem(c.Request.Context(), db.CreateRepairOrderItemParams{
			RepairOrderID: orderID,
			ItemType:      req.ItemType,
			ItemName:      req.ItemName,
			Quantity:      req.Quantity,
			UnitPrice:     unitPrice,
			PartID:        partUUID,
		})
		if err != nil {
			return fmt.Errorf("không thể thêm hạng mục: %w", err)
		}

		// 5. Tự động tính toán lại total_cost NGUYÊN TỬ trực tiếp dưới Database
		updatedOrder, err = q.RecalculateRepairOrderTotalCost(c.Request.Context(), orderID)
		return err
	})

	if err != nil {
		httperr.HandleDBError(c, err, "Thêm vật tư/công thợ")
		return
	}

	res := gin.H{
		"item":        createdItem,
		"total_cost":  updatedOrder.TotalCost,
		"order_status": updatedOrder.Status,
	}

	response.Success(c, http.StatusCreated, res, "Thêm hạng mục vật tư/công thợ thành công")
}

type deleteItemRequest struct {
	ID     string `uri:"id" binding:"required,uuid"`
	ItemID string `uri:"item_id" binding:"required,uuid"`
}

// DeleteItem xóa một hạng mục vật tư/công thợ và tính lại total_cost nguyên tử dưới DB
func (h *RepairOrderHandler) DeleteItem(c *gin.Context) {
	var req deleteItemRequest
	if err := c.ShouldBindUri(&req); err != nil {
		response.BadRequest(c, "ID lệnh hoặc ID hạng mục không hợp lệ", err.Error())
		return
	}

	orderID, _ := uuid.Parse(req.ID)
	itemID, _ := uuid.Parse(req.ItemID)
	var updatedOrder db.RepairOrder

	err := h.store.ExecTx(c.Request.Context(), func(q *db.Queries) error {
		// 1. Khóa bi quan lệnh sửa chữa
		order, err := q.GetRepairOrderForUpdate(c.Request.Context(), orderID)
		if err != nil {
			return err
		}

		// 2. Kiểm tra tính hợp lệ
		if err := domain.ValidateItemModification(order.Status); err != nil {
			return err
		}

		// 3. Xóa item
		if err := q.DeleteRepairOrderItem(c.Request.Context(), itemID); err != nil {
			return err
		}

		// 4. Tính toán lại total_cost NGUYÊN TỬ dưới DB
		updatedOrder, err = q.RecalculateRepairOrderTotalCost(c.Request.Context(), orderID)
		return err
	})

	if err != nil {
		httperr.HandleDBError(c, err, "Xóa hạng mục vật tư")
		return
	}

	res := gin.H{
		"total_cost": updatedOrder.TotalCost,
	}

	response.Success(c, http.StatusOK, res, "Xóa hạng mục vật tư/công thợ thành công")
}

// CreateInvoiceForRepairOrder xuất Hóa đơn thanh toán cho lệnh sửa chữa đã COMPLETED
func (h *RepairOrderHandler) CreateInvoiceForRepairOrder(c *gin.Context) {
	var uriReq getRepairOrderRequest
	if err := c.ShouldBindUri(&uriReq); err != nil {
		response.BadRequest(c, "ID lệnh sửa chữa không hợp lệ", err.Error())
		return
	}

	payload, _ := middleware.GetAuthPayload(c)
	branchID := payload.BranchID
	if branchID == uuid.Nil {
		response.BadRequest(c, "Yêu cầu ngữ cảnh chi nhánh hợp lệ để xuất hóa đơn", nil)
		return
	}

	orderID, _ := uuid.Parse(uriReq.ID)
	var createdInvoice db.Invoice

	err := h.store.ExecTx(c.Request.Context(), func(q *db.Queries) error {
		// 1. Khóa bi quan lệnh sửa chữa
		order, err := q.GetRepairOrderForUpdate(c.Request.Context(), orderID)
		if err != nil {
			return err
		}

		if order.Status != domain.RepairOrderStatusCompleted {
			return domain.NewValidationError("chỉ lệnh sửa chữa đã hoàn thành (COMPLETED) mới được phép xuất hóa đơn, hiện tại đang ở trạng thái '%s'", order.Status)
		}

		costDec := numericToDecimal(order.TotalCost)
		if costDec.LessThanOrEqual(decimal.Zero) {
			return domain.NewValidationError("tổng chi phí sửa chữa phải lớn hơn 0 để xuất hóa đơn")
		}

		// 2. Tạo hóa đơn thanh toán
		invNumber := fmt.Sprintf("INV-SRV-%d", time.Now().UnixNano()%10000000)
		dueDate := time.Now().AddDate(0, 0, 7) // Hạn thanh toán 7 ngày

		createdInvoice, err = q.CreateInvoice(c.Request.Context(), db.CreateInvoiceParams{
			BranchID:      branchID,
			RepairOrderID: pgtype.UUID{Bytes: orderID, Valid: true},
			InvoiceNumber: invNumber,
			Amount:        order.TotalCost,
			DueDate:       pgtype.Date{Time: dueDate, Valid: true},
			Status:        pgtype.Text{String: domain.InvoiceStatusUnpaid, Valid: true},
		})
		if err != nil {
			return fmt.Errorf("không thể tạo hóa đơn dịch vụ: %w", err)
		}

		// 3. Cập nhật lệnh sửa chữa sang INVOICED
		_, err = q.UpdateRepairOrderStatus(c.Request.Context(), db.UpdateRepairOrderStatusParams{
			ID:     orderID,
			Status: domain.RepairOrderStatusInvoiced,
		})

		return err
	})

	if err != nil {
		httperr.HandleDBError(c, err, "Xuất hóa đơn dịch vụ")
		return
	}

	response.Success(c, http.StatusCreated, createdInvoice, "Xuất hóa đơn dịch vụ thành công")
}
