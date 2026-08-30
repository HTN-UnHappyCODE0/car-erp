package handler

import (
	"fmt"
	"net/http"

	"erp-backend/db/sqlc"
	"erp-backend/internal/api/httperr"
	"erp-backend/internal/api/middleware"
	"erp-backend/internal/api/response"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgtype"
)

type VehicleHandler struct {
	store db.Store
}

func NewVehicleHandler(store db.Store) *VehicleHandler {
	return &VehicleHandler{
		store: store,
	}
}

type createVehicleRequest struct {
	BranchID      *string `json:"branch_id"`
	ModelID       string  `json:"model_id" binding:"required,uuid"`
	VIN           string  `json:"vin" binding:"required,min=17,max=17"`
	EngineNumber  *string `json:"engine_number"`
	ColorExterior *string `json:"color_exterior"`
	ColorInterior *string `json:"color_interior"`
	Status        *string `json:"status" binding:"omitempty,oneof=IN_TRANSIT IN_STOCK RESERVED SOLD MAINTENANCE"`
	PurchasePrice string  `json:"purchase_price" binding:"required"`
}

// CreateVehicle nhập một xe mới vào kho chi nhánh (Validate VIN duy nhất & áp dụng RLS)
func (h *VehicleHandler) CreateVehicle(c *gin.Context) {
	var req createVehicleRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, "Dữ liệu nhập xe không hợp lệ", err.Error())
		return
	}

	payload, _ := middleware.GetAuthPayload(c)
	branchID := payload.BranchID

	// Nếu là superadmin và có chỉ định branch_id trong body
	if payload.Role == "superadmin" && req.BranchID != nil {
		parsedBranchID, err := uuid.Parse(*req.BranchID)
		if err == nil && parsedBranchID != uuid.Nil {
			branchID = parsedBranchID
		}
	}

	if branchID == uuid.Nil {
		response.BadRequest(c, "Yêu cầu cung cấp branch_id hợp lệ cho kho xe", nil)
		return
	}

	modelID, _ := uuid.Parse(req.ModelID)

	var price pgtype.Numeric
	if err := price.Scan(req.PurchasePrice); err != nil {
		response.BadRequest(c, "Giá nhập xe không hợp lệ (phải là số thập phân dương)", err.Error())
		return
	}

	status := "IN_STOCK"
	if req.Status != nil && *req.Status != "" {
		status = *req.Status
	}

	arg := db.CreateVehicleParams{
		BranchID:      branchID,
		ModelID:       modelID,
		Vin:           req.VIN,
		Status:        status,
		PurchasePrice: price,
	}

	if req.EngineNumber != nil {
		arg.EngineNumber = pgtype.Text{String: *req.EngineNumber, Valid: true}
	}
	if req.ColorExterior != nil {
		arg.ColorExterior = pgtype.Text{String: *req.ColorExterior, Valid: true}
	}
	if req.ColorInterior != nil {
		arg.ColorInterior = pgtype.Text{String: *req.ColorInterior, Valid: true}
	}

	var createdVehicle db.Vehicle
	err := h.store.ExecTx(c.Request.Context(), func(q *db.Queries) error {
		var err error
		createdVehicle, err = q.CreateVehicle(c.Request.Context(), arg)
		return err
	})

	if err != nil {
		httperr.HandleDBError(c, err, "Xe trong kho (VIN)")
		return
	}

	response.Success(c, http.StatusCreated, createdVehicle, "Nhập xe vào kho thành công")
}

type getVehicleRequest struct {
	ID string `uri:"id" binding:"required,uuid"`
}

// GetVehicle lấy chi tiết một xe trong kho theo ID (Áp dụng RLS chi nhánh)
func (h *VehicleHandler) GetVehicle(c *gin.Context) {
	var req getVehicleRequest
	if err := c.ShouldBindUri(&req); err != nil {
		response.BadRequest(c, "ID xe không hợp lệ", err.Error())
		return
	}

	vehicleID, _ := uuid.Parse(req.ID)
	var vehicle db.Vehicle

	err := h.store.ExecTx(c.Request.Context(), func(q *db.Queries) error {
		var err error
		vehicle, err = q.GetVehicle(c.Request.Context(), vehicleID)
		return err
	})

	if err != nil {
		httperr.HandleDBError(c, err, "Xe trong kho")
		return
	}

	response.Success(c, http.StatusOK, vehicle, "Lấy thông tin xe thành công")
}

type getVehicleByVINRequest struct {
	VIN string `uri:"vin" binding:"required,min=17,max=17"`
}

// GetVehicleByVIN tra cứu xe theo số khung VIN
func (h *VehicleHandler) GetVehicleByVIN(c *gin.Context) {
	var req getVehicleByVINRequest
	if err := c.ShouldBindUri(&req); err != nil {
		response.BadRequest(c, "Số VIN không hợp lệ (phải đúng 17 ký tự)", err.Error())
		return
	}

	var vehicle db.Vehicle
	err := h.store.ExecTx(c.Request.Context(), func(q *db.Queries) error {
		var err error
		vehicle, err = q.GetVehicleByVIN(c.Request.Context(), req.VIN)
		return err
	})

	if err != nil {
		httperr.HandleDBError(c, err, "Xe theo số VIN")
		return
	}

	response.Success(c, http.StatusOK, vehicle, "Tra cứu xe theo số VIN thành công")
}

type listVehiclesRequest struct {
	PageID   int32   `form:"page_id" binding:"omitempty,min=1"`
	PageSize int32   `form:"page_size" binding:"omitempty,min=5,max=100"`
	Status   *string `form:"status" binding:"omitempty,oneof=IN_TRANSIT IN_STOCK RESERVED SOLD MAINTENANCE"`
}

// ListVehicles lấy danh sách xe trong kho (RLS tự động lọc theo chi nhánh của user, hoặc tất cả nếu superadmin)
func (h *VehicleHandler) ListVehicles(c *gin.Context) {
	var req listVehiclesRequest
	if err := c.ShouldBindQuery(&req); err != nil {
		response.BadRequest(c, "Tham số truy vấn danh sách xe không hợp lệ", err.Error())
		return
	}

	if req.PageID == 0 {
		req.PageID = 1
	}
	if req.PageSize == 0 {
		req.PageSize = 10
	}

	offset := (req.PageID - 1) * req.PageSize
	var vehicles []db.Vehicle

	err := h.store.ExecTx(c.Request.Context(), func(q *db.Queries) error {
		var err error
		if req.Status != nil && *req.Status != "" {
			vehicles, err = q.ListVehiclesByStatus(c.Request.Context(), db.ListVehiclesByStatusParams{
				Status: *req.Status,
				Limit:  req.PageSize,
				Offset: offset,
			})
		} else {
			vehicles, err = q.ListVehicles(c.Request.Context(), db.ListVehiclesParams{
				Limit:  req.PageSize,
				Offset: offset,
			})
		}
		return err
	})

	if err != nil {
		httperr.HandleDBError(c, err, "Danh sách xe trong kho")
		return
	}

	response.Success(c, http.StatusOK, vehicles, "Lấy danh sách xe trong kho thành công")
}

type updateVehicleStatusRequest struct {
	Status string `json:"status" binding:"required,oneof=IN_TRANSIT IN_STOCK RESERVED SOLD MAINTENANCE"`
}

// UpdateVehicleStatus cập nhật trạng thái kho của xe
func (h *VehicleHandler) UpdateVehicleStatus(c *gin.Context) {
	var uriReq getVehicleRequest
	if err := c.ShouldBindUri(&uriReq); err != nil {
		response.BadRequest(c, "ID xe không hợp lệ", err.Error())
		return
	}

	var req updateVehicleStatusRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, "Trạng thái xe không hợp lệ", err.Error())
		return
	}

	vehicleID, _ := uuid.Parse(uriReq.ID)
	var updatedVehicle db.Vehicle

	err := h.store.ExecTx(c.Request.Context(), func(q *db.Queries) error {
		var err error
		updatedVehicle, err = q.UpdateVehicleStatus(c.Request.Context(), db.UpdateVehicleStatusParams{
			ID:     vehicleID,
			Status: req.Status,
		})
		return err
	})

	if err != nil {
		httperr.HandleDBError(c, err, "Xe trong kho")
		return
	}

	response.Success(c, http.StatusOK, updatedVehicle, "Cập nhật trạng thái xe thành công")
}

type transferVehicleRequest struct {
	ToBranchID string `json:"to_branch_id" binding:"required,uuid"`
}

// TransferVehicle thực hiện điều chuyển xe từ chi nhánh hiện tại sang chi nhánh khác trong Transaction an toàn
func (h *VehicleHandler) TransferVehicle(c *gin.Context) {
	var uriReq getVehicleRequest
	if err := c.ShouldBindUri(&uriReq); err != nil {
		response.BadRequest(c, "ID xe không hợp lệ", err.Error())
		return
	}

	var req transferVehicleRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, "Chi nhánh đích không hợp lệ", err.Error())
		return
	}

	payload, ok := middleware.GetAuthPayload(c)
	if !ok || payload == nil {
		response.Unauthorized(c, "Yêu cầu đăng nhập")
		return
	}

	vehicleID, _ := uuid.Parse(uriReq.ID)
	toBranchID, _ := uuid.Parse(req.ToBranchID)

	var transferredVehicle db.Vehicle

	// Sử dụng ExecPrivilegedTx để bypass RLS WITH CHECK sau khi đã xác thực quyền sở hữu ở tầng ứng dụng
	err := h.store.ExecPrivilegedTx(c.Request.Context(), func(q *db.Queries) error {
		// 1. Kiểm tra xe có tồn tại trong hệ thống không
		vehicle, err := q.GetVehicle(c.Request.Context(), vehicleID)
		if err != nil {
			return err
		}

		// 2. Nếu người gọi không phải superadmin, bắt buộc xe phải thuộc về chi nhánh của người gọi
		if payload.Role != "superadmin" && vehicle.BranchID != payload.BranchID {
			return fmt.Errorf("bạn chỉ có quyền điều chuyển xe thuộc chi nhánh của mình")
		}

		// 3. Kiểm tra chi nhánh đích
		if vehicle.BranchID == toBranchID {
			return fmt.Errorf("xe đã thuộc chi nhánh đích này rồi")
		}

		// 4. Kiểm tra trạng thái xe
		if vehicle.Status == "RESERVED" || vehicle.Status == "SOLD" {
			return fmt.Errorf("không thể điều chuyển xe đang có trạng thái: %s", vehicle.Status)
		}

		// 5. Kiểm tra chi nhánh đích có tồn tại không
		_, err = q.GetBranch(c.Request.Context(), toBranchID)
		if err != nil {
			return fmt.Errorf("chi nhánh đích không tồn tại")
		}

		// 6. Thực hiện chuyển xe sang chi nhánh mới và đặt trạng thái IN_TRANSIT
		transferredVehicle, err = q.TransferVehicleBranch(c.Request.Context(), db.TransferVehicleBranchParams{
			ID:       vehicleID,
			BranchID: toBranchID,
		})
		return err
	})

	if err != nil {
		httperr.HandleDBError(c, err, "Điều chuyển xe")
		return
	}

	response.Success(c, http.StatusOK, transferredVehicle, "Điều chuyển xe sang chi nhánh mới thành công")
}
