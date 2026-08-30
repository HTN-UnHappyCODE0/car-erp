package handler

import (
	"encoding/json"
	"net/http"

	"erp-backend/db/sqlc"
	"erp-backend/internal/api/httperr"
	"erp-backend/internal/api/response"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgtype"
)

type VehicleModelHandler struct {
	store db.Store
}

func NewVehicleModelHandler(store db.Store) *VehicleModelHandler {
	return &VehicleModelHandler{
		store: store,
	}
}

type createVehicleModelRequest struct {
	Make           string                 `json:"make" binding:"required"`
	Model          string                 `json:"model" binding:"required"`
	Year           int32                  `json:"year" binding:"required,min=1900,max=2100"`
	Trim           *string                `json:"trim"`
	Specifications map[string]interface{} `json:"specifications"`
}

// CreateVehicleModel tạo một model/dòng xe mới vào danh mục chung (Yêu cầu quyền superadmin)
func (h *VehicleModelHandler) CreateVehicleModel(c *gin.Context) {
	var req createVehicleModelRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, "Dữ liệu tạo dòng xe không hợp lệ", err.Error())
		return
	}

	specsBytes := []byte("{}")
	if req.Specifications != nil {
		var err error
		specsBytes, err = json.Marshal(req.Specifications)
		if err != nil {
			response.BadRequest(c, "Thông số kỹ thuật JSON không hợp lệ", err.Error())
			return
		}
	}

	arg := db.CreateVehicleModelParams{
		Make:           req.Make,
		Model:          req.Model,
		Year:           req.Year,
		Specifications: specsBytes,
	}

	if req.Trim != nil {
		arg.Trim = pgtype.Text{String: *req.Trim, Valid: true}
	}

	model, err := h.store.CreateVehicleModel(c.Request.Context(), arg)
	if err != nil {
		httperr.HandleDBError(c, err, "Dòng xe")
		return
	}

	response.Success(c, http.StatusCreated, model, "Tạo dòng xe thành công")
}

type getVehicleModelRequest struct {
	ID string `uri:"id" binding:"required,uuid"`
}

// GetVehicleModel lấy thông tin chi tiết một dòng xe theo ID
func (h *VehicleModelHandler) GetVehicleModel(c *gin.Context) {
	var req getVehicleModelRequest
	if err := c.ShouldBindUri(&req); err != nil {
		response.BadRequest(c, "ID dòng xe không hợp lệ", err.Error())
		return
	}

	modelID, _ := uuid.Parse(req.ID)
	model, err := h.store.GetVehicleModel(c.Request.Context(), modelID)
	if err != nil {
		httperr.HandleDBError(c, err, "Dòng xe")
		return
	}

	response.Success(c, http.StatusOK, model, "Lấy thông tin dòng xe thành công")
}

type listVehicleModelsRequest struct {
	PageID   int32   `form:"page_id" binding:"omitempty,min=1"`
	PageSize int32   `form:"page_size" binding:"omitempty,min=5,max=100"`
	Make     *string `form:"make"`
}

// ListVehicleModels lấy danh sách dòng xe có phân trang và lọc theo hãng sản xuất
func (h *VehicleModelHandler) ListVehicleModels(c *gin.Context) {
	var req listVehicleModelsRequest
	if err := c.ShouldBindQuery(&req); err != nil {
		response.BadRequest(c, "Tham số truy vấn không hợp lệ", err.Error())
		return
	}

	if req.PageID == 0 {
		req.PageID = 1
	}
	if req.PageSize == 0 {
		req.PageSize = 10
	}

	offset := (req.PageID - 1) * req.PageSize

	if req.Make != nil && *req.Make != "" {
		models, err := h.store.ListVehicleModelsByMake(c.Request.Context(), db.ListVehicleModelsByMakeParams{
			Make:   "%" + *req.Make + "%",
			Limit:  req.PageSize,
			Offset: offset,
		})
		if err != nil {
			httperr.HandleDBError(c, err, "Danh sách dòng xe")
			return
		}
		response.Success(c, http.StatusOK, models, "Lấy danh sách dòng xe thành công")
		return
	}

	models, err := h.store.ListVehicleModels(c.Request.Context(), db.ListVehicleModelsParams{
		Limit:  req.PageSize,
		Offset: offset,
	})
	if err != nil {
		httperr.HandleDBError(c, err, "Danh sách dòng xe")
		return
	}

	response.Success(c, http.StatusOK, models, "Lấy danh sách dòng xe thành công")
}

type updateVehicleModelRequest struct {
	Make           *string                `json:"make"`
	Model          *string                `json:"model"`
	Year           *int32                 `json:"year" binding:"omitempty,min=1900,max=2100"`
	Trim           *string                `json:"trim"`
	Specifications map[string]interface{} `json:"specifications"`
}

// UpdateVehicleModel cập nhật thông tin dòng xe
func (h *VehicleModelHandler) UpdateVehicleModel(c *gin.Context) {
	var uriReq getVehicleModelRequest
	if err := c.ShouldBindUri(&uriReq); err != nil {
		response.BadRequest(c, "ID dòng xe không hợp lệ", err.Error())
		return
	}

	var req updateVehicleModelRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, "Dữ liệu cập nhật không hợp lệ", err.Error())
		return
	}

	modelID, _ := uuid.Parse(uriReq.ID)
	arg := db.UpdateVehicleModelParams{
		ID: modelID,
	}

	if req.Make != nil {
		arg.Make = *req.Make
	}
	if req.Model != nil {
		arg.Model = *req.Model
	}
	if req.Year != nil {
		arg.Year = *req.Year
	}
	if req.Trim != nil {
		arg.Trim = pgtype.Text{String: *req.Trim, Valid: true}
	}
	if req.Specifications != nil {
		specsBytes, err := json.Marshal(req.Specifications)
		if err == nil {
			arg.Specifications = specsBytes
		}
	}

	updated, err := h.store.UpdateVehicleModel(c.Request.Context(), arg)
	if err != nil {
		httperr.HandleDBError(c, err, "Dòng xe")
		return
	}

	response.Success(c, http.StatusOK, updated, "Cập nhật dòng xe thành công")
}

// DeleteVehicleModel xóa một dòng xe
func (h *VehicleModelHandler) DeleteVehicleModel(c *gin.Context) {
	var uriReq getVehicleModelRequest
	if err := c.ShouldBindUri(&uriReq); err != nil {
		response.BadRequest(c, "ID dòng xe không hợp lệ", err.Error())
		return
	}

	modelID, _ := uuid.Parse(uriReq.ID)
	err := h.store.DeleteVehicleModel(c.Request.Context(), modelID)
	if err != nil {
		httperr.HandleDBError(c, err, "Dòng xe")
		return
	}

	response.Success(c, http.StatusOK, nil, "Xóa dòng xe thành công")
}
