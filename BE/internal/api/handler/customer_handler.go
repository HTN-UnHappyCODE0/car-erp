package handler

import (
	"net/http"

	"erp-backend/db/sqlc"
	"erp-backend/internal/api/httperr"
	"erp-backend/internal/api/response"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgtype"
)

type CustomerHandler struct {
	store db.Store
}

func NewCustomerHandler(store db.Store) *CustomerHandler {
	return &CustomerHandler{
		store: store,
	}
}

type createCustomerRequest struct {
	Type         *string `json:"type" binding:"omitempty,oneof=INDIVIDUAL ENTERPRISE"`
	Name         string  `json:"name" binding:"required,min=2,max=255"`
	Phone        string  `json:"phone" binding:"required,min=8,max=20"`
	Email        *string `json:"email" binding:"omitempty,email"`
	IDCardNumber *string `json:"id_card_number"`
	Address      *string `json:"address"`
}

// CreateCustomer tạo hồ sơ khách hàng mới (dùng chung toàn tập đoàn, không RLS)
func (h *CustomerHandler) CreateCustomer(c *gin.Context) {
	var req createCustomerRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, "Dữ liệu khách hàng không hợp lệ", err.Error())
		return
	}

	custType := "INDIVIDUAL"
	if req.Type != nil && *req.Type != "" {
		custType = *req.Type
	}

	arg := db.CreateCustomerParams{
		Type:  pgtype.Text{String: custType, Valid: true},
		Name:  req.Name,
		Phone: req.Phone,
	}

	if req.Email != nil {
		arg.Email = pgtype.Text{String: *req.Email, Valid: true}
	}
	if req.IDCardNumber != nil {
		arg.IDCardNumber = pgtype.Text{String: *req.IDCardNumber, Valid: true}
	}
	if req.Address != nil {
		arg.Address = pgtype.Text{String: *req.Address, Valid: true}
	}

	customer, err := h.store.CreateCustomer(c.Request.Context(), arg)
	if err != nil {
		httperr.HandleDBError(c, err, "Khách hàng (Số điện thoại)")
		return
	}

	response.Success(c, http.StatusCreated, customer, "Tạo hồ sơ khách hàng thành công")
}

type getCustomerRequest struct {
	ID string `uri:"id" binding:"required,uuid"`
}

// GetCustomer xem chi tiết hồ sơ khách hàng theo ID
func (h *CustomerHandler) GetCustomer(c *gin.Context) {
	var req getCustomerRequest
	if err := c.ShouldBindUri(&req); err != nil {
		response.BadRequest(c, "ID khách hàng không hợp lệ", err.Error())
		return
	}

	customerID, _ := uuid.Parse(req.ID)
	customer, err := h.store.GetCustomer(c.Request.Context(), customerID)
	if err != nil {
		httperr.HandleDBError(c, err, "Khách hàng")
		return
	}

	// Lấy thêm lịch sử các cơ hội (Leads) của khách hàng
	leads, _ := h.store.ListLeadsByCustomer(c.Request.Context(), customerID)

	response.Success(c, http.StatusOK, gin.H{
		"customer": customer,
		"leads":    leads,
	}, "Lấy thông tin khách hàng thành công")
}

type getCustomerByPhoneRequest struct {
	Phone string `uri:"phone" binding:"required,min=8,max=20"`
}

// GetCustomerByPhone tra cứu nhanh hồ sơ khách hàng khi có cuộc gọi / liên hệ
func (h *CustomerHandler) GetCustomerByPhone(c *gin.Context) {
	var req getCustomerByPhoneRequest
	if err := c.ShouldBindUri(&req); err != nil {
		response.BadRequest(c, "Số điện thoại không hợp lệ", err.Error())
		return
	}

	customer, err := h.store.GetCustomerByPhone(c.Request.Context(), req.Phone)
	if err != nil {
		httperr.HandleDBError(c, err, "Khách hàng theo số điện thoại")
		return
	}

	response.Success(c, http.StatusOK, customer, "Tra cứu khách hàng thành công")
}

type listCustomersRequest struct {
	PageID   int32   `form:"page_id" binding:"omitempty,min=1"`
	PageSize int32   `form:"page_size" binding:"omitempty,min=5,max=100"`
	Search   *string `form:"search"`
}

// ListCustomers lấy danh sách khách hàng có tìm kiếm và phân trang
func (h *CustomerHandler) ListCustomers(c *gin.Context) {
	var req listCustomersRequest
	if err := c.ShouldBindQuery(&req); err != nil {
		response.BadRequest(c, "Tham số tìm kiếm không hợp lệ", err.Error())
		return
	}

	if req.PageID == 0 {
		req.PageID = 1
	}
	if req.PageSize == 0 {
		req.PageSize = 10
	}

	offset := (req.PageID - 1) * req.PageSize

	if req.Search != nil && *req.Search != "" {
		customers, err := h.store.SearchCustomers(c.Request.Context(), db.SearchCustomersParams{
			Name:   "%" + *req.Search + "%",
			Limit:  req.PageSize,
			Offset: offset,
		})
		if err != nil {
			httperr.HandleDBError(c, err, "Danh sách khách hàng")
			return
		}
		response.Success(c, http.StatusOK, customers, "Lấy danh sách khách hàng thành công")
		return
	}

	customers, err := h.store.ListCustomers(c.Request.Context(), db.ListCustomersParams{
		Limit:  req.PageSize,
		Offset: offset,
	})
	if err != nil {
		httperr.HandleDBError(c, err, "Danh sách khách hàng")
		return
	}

	response.Success(c, http.StatusOK, customers, "Lấy danh sách khách hàng thành công")
}

type updateCustomerRequest struct {
	Type         *string `json:"type" binding:"omitempty,oneof=INDIVIDUAL ENTERPRISE"`
	Name         *string `json:"name"`
	Phone        *string `json:"phone"`
	Email        *string `json:"email" binding:"omitempty,email"`
	IDCardNumber *string `json:"id_card_number"`
	Address      *string `json:"address"`
}

// UpdateCustomer cập nhật hồ sơ khách hàng
func (h *CustomerHandler) UpdateCustomer(c *gin.Context) {
	var uriReq getCustomerRequest
	if err := c.ShouldBindUri(&uriReq); err != nil {
		response.BadRequest(c, "ID khách hàng không hợp lệ", err.Error())
		return
	}

	var req updateCustomerRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, "Dữ liệu cập nhật không hợp lệ", err.Error())
		return
	}

	customerID, _ := uuid.Parse(uriReq.ID)
	arg := db.UpdateCustomerParams{
		ID: customerID,
	}

	if req.Type != nil {
		arg.Type = pgtype.Text{String: *req.Type, Valid: true}
	}
	if req.Name != nil {
		arg.Name = *req.Name
	}
	if req.Phone != nil {
		arg.Phone = *req.Phone
	}
	if req.Email != nil {
		arg.Email = pgtype.Text{String: *req.Email, Valid: true}
	}
	if req.IDCardNumber != nil {
		arg.IDCardNumber = pgtype.Text{String: *req.IDCardNumber, Valid: true}
	}
	if req.Address != nil {
		arg.Address = pgtype.Text{String: *req.Address, Valid: true}
	}

	updated, err := h.store.UpdateCustomer(c.Request.Context(), arg)
	if err != nil {
		httperr.HandleDBError(c, err, "Khách hàng")
		return
	}

	response.Success(c, http.StatusOK, updated, "Cập nhật hồ sơ khách hàng thành công")
}
