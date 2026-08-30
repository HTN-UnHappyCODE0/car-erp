package handler

import (
	"errors"
	"net/http"

	"erp-backend/db/sqlc"
	"erp-backend/internal/api/httperr"
	"erp-backend/internal/api/middleware"
	"erp-backend/internal/api/response"
	"erp-backend/internal/domain"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgtype"
)

type LeadHandler struct {
	store db.Store
}

func NewLeadHandler(store db.Store) *LeadHandler {
	return &LeadHandler{
		store: store,
	}
}

type createLeadRequest struct {
	CustomerID        *string `json:"customer_id" binding:"omitempty,uuid"`
	CustomerName      *string `json:"customer_name"`
	CustomerPhone     *string `json:"customer_phone"`
	CampaignID        *string `json:"campaign_id" binding:"omitempty,uuid"`
	AssignedTo        *string `json:"assigned_to" binding:"omitempty,uuid"`
	InterestedModelID *string `json:"interested_model_id" binding:"omitempty,uuid"`
	Notes             *string `json:"notes"`
}

// CreateLead tạo một cơ hội bán hàng mới (tự động gắn với khách hàng hoặc tạo mới khách hàng)
func (h *LeadHandler) CreateLead(c *gin.Context) {
	var req createLeadRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, "Dữ liệu cơ hội bán hàng không hợp lệ", err.Error())
		return
	}

	payload, _ := middleware.GetAuthPayload(c)
	branchID := payload.BranchID

	if branchID == uuid.Nil {
		response.BadRequest(c, "Yêu cầu ngữ cảnh chi nhánh hợp lệ để tạo Lead", nil)
		return
	}

	var createdLead db.Lead

	err := h.store.ExecTx(c.Request.Context(), func(q *db.Queries) error {
		var customerID uuid.UUID

		// 1. Xác định Customer ID (Tìm hoặc Tạo mới)
		if req.CustomerID != nil && *req.CustomerID != "" {
			parsedCID, err := uuid.Parse(*req.CustomerID)
			if err != nil {
				return errors.New("customer_id không hợp lệ")
			}
			customerID = parsedCID
		} else if req.CustomerPhone != nil && *req.CustomerPhone != "" {
			// Tra cứu xem số điện thoại khách hàng đã tồn tại chưa
			existingCustomer, err := q.GetCustomerByPhone(c.Request.Context(), *req.CustomerPhone)
			if err == nil {
				customerID = existingCustomer.ID
			} else if errors.Is(err, pgx.ErrNoRows) {
				// Tạo mới khách hàng nhanh
				name := "Khách hàng mới"
				if req.CustomerName != nil && *req.CustomerName != "" {
					name = *req.CustomerName
				}
				newCust, createCustErr := q.CreateCustomer(c.Request.Context(), db.CreateCustomerParams{
					Type:  pgtype.Text{String: "INDIVIDUAL", Valid: true},
					Name:  name,
					Phone: *req.CustomerPhone,
				})
				if createCustErr != nil {
					return createCustErr
				}
				customerID = newCust.ID
			} else {
				return err
			}
		} else {
			return errors.New("vui lòng cung cấp customer_id hoặc customer_phone")
		}

		// 2. Chuẩn bị tham số tạo Lead
		arg := db.CreateLeadParams{
			BranchID:   branchID,
			CustomerID: customerID,
			Status:     domain.LeadStatusNew,
		}

		if req.CampaignID != nil && *req.CampaignID != "" {
			campID, _ := uuid.Parse(*req.CampaignID)
			arg.CampaignID = pgtype.UUID{Bytes: campID, Valid: true}
		}

		if req.AssignedTo != nil && *req.AssignedTo != "" {
			assigneeID, _ := uuid.Parse(*req.AssignedTo)
			arg.AssignedTo = pgtype.UUID{Bytes: assigneeID, Valid: true}
		} else if payload.Role == "salesperson" {
			// Mặc định gán cho chính Sales tạo lead (sử dụng EmployeeID tham chiếu employees)
			empID := payload.EmployeeID
			if empID == uuid.Nil {
				empID = payload.UserID
			}
			arg.AssignedTo = pgtype.UUID{Bytes: empID, Valid: true}
		}

		if req.InterestedModelID != nil && *req.InterestedModelID != "" {
			modelID, _ := uuid.Parse(*req.InterestedModelID)
			arg.InterestedModelID = pgtype.UUID{Bytes: modelID, Valid: true}
		}

		if req.Notes != nil {
			arg.Notes = pgtype.Text{String: *req.Notes, Valid: true}
		}

		var err error
		createdLead, err = q.CreateLead(c.Request.Context(), arg)
		return err
	})

	if err != nil {
		httperr.HandleDBError(c, err, "Cơ hội bán hàng (Lead)")
		return
	}

	response.Success(c, http.StatusCreated, createdLead, "Tạo cơ hội bán hàng thành công")
}

type getLeadRequest struct {
	ID string `uri:"id" binding:"required,uuid"`
}

// GetLead xem thông tin chi tiết một Lead (Bảo vệ bởi RLS chi nhánh)
func (h *LeadHandler) GetLead(c *gin.Context) {
	var req getLeadRequest
	if err := c.ShouldBindUri(&req); err != nil {
		response.BadRequest(c, "ID cơ hội bán hàng không hợp lệ", err.Error())
		return
	}

	leadID, _ := uuid.Parse(req.ID)
	var lead db.Lead

	err := h.store.ExecTx(c.Request.Context(), func(q *db.Queries) error {
		var err error
		lead, err = q.GetLead(c.Request.Context(), leadID)
		return err
	})

	if err != nil {
		httperr.HandleDBError(c, err, "Cơ hội bán hàng")
		return
	}

	response.Success(c, http.StatusOK, lead, "Lấy thông tin cơ hội bán hàng thành công")
}

type listLeadsRequest struct {
	PageID   int32   `form:"page_id" binding:"omitempty,min=1"`
	PageSize int32   `form:"page_size" binding:"omitempty,min=5,max=100"`
	Status   *string `form:"status" binding:"omitempty,oneof=NEW CONTACTED TEST_DRIVE QUOTED WON LOST"`
}

// ListLeads lấy danh sách cơ hội bán hàng của chi nhánh (RLS tự động lọc)
func (h *LeadHandler) ListLeads(c *gin.Context) {
	var req listLeadsRequest
	if err := c.ShouldBindQuery(&req); err != nil {
		response.BadRequest(c, "Tham số truy vấn danh sách Lead không hợp lệ", err.Error())
		return
	}

	if req.PageID == 0 {
		req.PageID = 1
	}
	if req.PageSize == 0 {
		req.PageSize = 10
	}

	offset := (req.PageID - 1) * req.PageSize
	var leads []db.Lead

	err := h.store.ExecTx(c.Request.Context(), func(q *db.Queries) error {
		var err error
		if req.Status != nil && *req.Status != "" {
			leads, err = q.ListLeadsByStatus(c.Request.Context(), db.ListLeadsByStatusParams{
				Status: *req.Status,
				Limit:  req.PageSize,
				Offset: offset,
			})
		} else {
			leads, err = q.ListLeads(c.Request.Context(), db.ListLeadsParams{
				Limit:  req.PageSize,
				Offset: offset,
			})
		}
		return err
	})

	if err != nil {
		httperr.HandleDBError(c, err, "Danh sách cơ hội bán hàng")
		return
	}

	response.Success(c, http.StatusOK, leads, "Lấy danh sách cơ hội bán hàng thành công")
}

type updateLeadStatusRequest struct {
	Status string  `json:"status" binding:"required,oneof=NEW CONTACTED TEST_DRIVE QUOTED WON LOST"`
	Notes  *string `json:"notes"`
}

// UpdateLeadStatus cập nhật tiến trình chăm sóc cơ hội bán hàng
func (h *LeadHandler) UpdateLeadStatus(c *gin.Context) {
	var uriReq getLeadRequest
	if err := c.ShouldBindUri(&uriReq); err != nil {
		response.BadRequest(c, "ID cơ hội bán hàng không hợp lệ", err.Error())
		return
	}

	var req updateLeadStatusRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, "Trạng thái cơ hội bán hàng không hợp lệ", err.Error())
		return
	}

	leadID, _ := uuid.Parse(uriReq.ID)
	var updatedLead db.Lead

	err := h.store.ExecTx(c.Request.Context(), func(q *db.Queries) error {
		arg := db.UpdateLeadStatusParams{
			ID:     leadID,
			Status: req.Status,
		}
		if req.Notes != nil {
			arg.Notes = pgtype.Text{String: *req.Notes, Valid: true}
		}

		var err error
		updatedLead, err = q.UpdateLeadStatus(c.Request.Context(), arg)
		return err
	})

	if err != nil {
		httperr.HandleDBError(c, err, "Cơ hội bán hàng")
		return
	}

	response.Success(c, http.StatusOK, updatedLead, "Cập nhật trạng thái cơ hội bán hàng thành công")
}

type assignLeadRequest struct {
	AssignedTo string `json:"assigned_to" binding:"required,uuid"`
}

// AssignLead phân bổ Lead cho nhân viên Sales phụ trách
func (h *LeadHandler) AssignLead(c *gin.Context) {
	var uriReq getLeadRequest
	if err := c.ShouldBindUri(&uriReq); err != nil {
		response.BadRequest(c, "ID cơ hội bán hàng không hợp lệ", err.Error())
		return
	}

	var req assignLeadRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, "ID nhân viên bán hàng không hợp lệ", err.Error())
		return
	}

	leadID, _ := uuid.Parse(uriReq.ID)
	assigneeID, _ := uuid.Parse(req.AssignedTo)
	var updatedLead db.Lead

	err := h.store.ExecTx(c.Request.Context(), func(q *db.Queries) error {
		var err error
		updatedLead, err = q.AssignLead(c.Request.Context(), db.AssignLeadParams{
			ID:         leadID,
			AssignedTo: pgtype.UUID{Bytes: assigneeID, Valid: true},
		})
		return err
	})

	if err != nil {
		httperr.HandleDBError(c, err, "Phân bổ cơ hội bán hàng")
		return
	}

	response.Success(c, http.StatusOK, updatedLead, "Phân bổ cơ hội bán hàng thành công")
}
