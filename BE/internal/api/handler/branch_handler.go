package handler

import (
	"errors"
	"net/http"

	"erp-backend/db/sqlc"
	"erp-backend/internal/api/response"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgtype"
)

type BranchHandler struct {
	store db.Store
}

func NewBranchHandler(store db.Store) *BranchHandler {
	return &BranchHandler{
		store: store,
	}
}

type createBranchRequest struct {
	Name    string  `json:"name" binding:"required"`
	Code    string  `json:"code" binding:"required,min=3,max=50"`
	Address *string `json:"address"`
	TaxCode *string `json:"tax_code"`
	Phone   *string `json:"phone"`
	Status  *string `json:"status"`
}

// CreateBranch tạo một chi nhánh đại lý mới (Yêu cầu quyền superadmin)
func (h *BranchHandler) CreateBranch(c *gin.Context) {
	var req createBranchRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, "Dữ liệu tạo chi nhánh không hợp lệ", err.Error())
		return
	}

	arg := db.CreateBranchParams{
		Name: req.Name,
		Code: req.Code,
	}

	if req.Address != nil {
		arg.Address = pgtype.Text{String: *req.Address, Valid: true}
	}
	if req.TaxCode != nil {
		arg.TaxCode = pgtype.Text{String: *req.TaxCode, Valid: true}
	}
	if req.Phone != nil {
		arg.Phone = pgtype.Text{String: *req.Phone, Valid: true}
	}
	if req.Status != nil {
		arg.Status = pgtype.Text{String: *req.Status, Valid: true}
	}

	branch, err := h.store.CreateBranch(c.Request.Context(), arg)
	if err != nil {
		response.InternalServerError(c, "Không thể tạo chi nhánh mới", err.Error())
		return
	}

	response.Success(c, http.StatusCreated, branch, "Tạo chi nhánh thành công")
}

type getBranchRequest struct {
	ID string `uri:"id" binding:"required,uuid"`
}

// GetBranch lấy thông tin chi tiết một chi nhánh theo ID
func (h *BranchHandler) GetBranch(c *gin.Context) {
	var req getBranchRequest
	if err := c.ShouldBindUri(&req); err != nil {
		response.BadRequest(c, "ID chi nhánh không hợp lệ (phải là UUID)", err.Error())
		return
	}

	branchID, _ := uuid.Parse(req.ID)
	branch, err := h.store.GetBranch(c.Request.Context(), branchID)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			response.NotFound(c, "Không tìm thấy chi nhánh với ID này")
			return
		}
		response.InternalServerError(c, "Lỗi truy vấn chi nhánh", err.Error())
		return
	}

	response.Success(c, http.StatusOK, branch, "Lấy thông tin chi nhánh thành công")
}

type listBranchesRequest struct {
	PageID   int32 `form:"page_id" binding:"required,min=1"`
	PageSize int32 `form:"page_size" binding:"required,min=5,max=100"`
}

// ListBranches lấy danh sách các chi nhánh có phân trang
func (h *BranchHandler) ListBranches(c *gin.Context) {
	var req listBranchesRequest
	if err := c.ShouldBindQuery(&req); err != nil {
		// Thiết lập mặc định nếu query params trống
		req.PageID = 1
		req.PageSize = 10
	}

	arg := db.ListBranchesParams{
		Limit:  req.PageSize,
		Offset: (req.PageID - 1) * req.PageSize,
	}

	branches, err := h.store.ListBranches(c.Request.Context(), arg)
	if err != nil {
		response.InternalServerError(c, "Lỗi lấy danh sách chi nhánh", err.Error())
		return
	}

	response.Success(c, http.StatusOK, branches, "Lấy danh sách chi nhánh thành công")
}
