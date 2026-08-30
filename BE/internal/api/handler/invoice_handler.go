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

type InvoiceHandler struct {
	store db.Store
}

func NewInvoiceHandler(store db.Store) *InvoiceHandler {
	return &InvoiceHandler{
		store: store,
	}
}

type createInvoiceRequest struct {
	OrderID       *string `json:"order_id" binding:"omitempty,uuid"`
	RepairOrderID *string `json:"repair_order_id" binding:"omitempty,uuid"`
	InvoiceNumber string  `json:"invoice_number" binding:"required,min=3"`
	Amount        string  `json:"amount" binding:"required"`
	DueDate       string  `json:"due_date" binding:"required"` // Format YYYY-MM-DD
}

// CreateInvoice tạo hóa đơn mới gắn với đơn hàng bán xe hoặc lệnh sửa chữa
func (h *InvoiceHandler) CreateInvoice(c *gin.Context) {
	var req createInvoiceRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, "Dữ liệu tạo hóa đơn không hợp lệ", err.Error())
		return
	}

	payload, _ := middleware.GetAuthPayload(c)
	branchID := payload.BranchID
	if branchID == uuid.Nil {
		response.BadRequest(c, "Yêu cầu ngữ cảnh chi nhánh hợp lệ để tạo hóa đơn", nil)
		return
	}

	var amount pgtype.Numeric
	if err := amount.Scan(req.Amount); err != nil {
		response.BadRequest(c, "Số tiền hóa đơn không hợp lệ", err.Error())
		return
	}

	dueDate, err := time.Parse("2006-01-02", req.DueDate)
	if err != nil {
		response.BadRequest(c, "Hạn thanh toán (due_date) phải có định dạng YYYY-MM-DD", err.Error())
		return
	}

	arg := db.CreateInvoiceParams{
		BranchID:      branchID,
		InvoiceNumber: req.InvoiceNumber,
		Amount:        amount,
		DueDate:       pgtype.Date{Time: dueDate, Valid: true},
		Status:        pgtype.Text{String: domain.InvoiceStatusUnpaid, Valid: true},
	}

	if req.OrderID != nil && *req.OrderID != "" {
		orderID, _ := uuid.Parse(*req.OrderID)
		arg.OrderID = pgtype.UUID{Bytes: orderID, Valid: true}
	}

	if req.RepairOrderID != nil && *req.RepairOrderID != "" {
		repairID, _ := uuid.Parse(*req.RepairOrderID)
		arg.RepairOrderID = pgtype.UUID{Bytes: repairID, Valid: true}
	}

	var createdInvoice db.Invoice
	err = h.store.ExecTx(c.Request.Context(), func(q *db.Queries) error {
		var createErr error
		createdInvoice, createErr = q.CreateInvoice(c.Request.Context(), arg)
		return createErr
	})

	if err != nil {
		httperr.HandleDBError(c, err, "Hóa đơn")
		return
	}

	response.Success(c, http.StatusCreated, createdInvoice, "Tạo hóa đơn thành công")
}

type getInvoiceRequest struct {
	ID string `uri:"id" binding:"required,uuid"`
}

type invoiceDetailResponse struct {
	db.Invoice
	Transactions []db.Transaction `json:"transactions"`
}

// GetInvoice xem thông tin chi tiết hóa đơn kèm danh sách giao dịch thanh toán
func (h *InvoiceHandler) GetInvoice(c *gin.Context) {
	var req getInvoiceRequest
	if err := c.ShouldBindUri(&req); err != nil {
		response.BadRequest(c, "ID hóa đơn không hợp lệ", err.Error())
		return
	}

	invoiceID, _ := uuid.Parse(req.ID)
	var invoice db.Invoice
	var txs []db.Transaction

	err := h.store.ExecTx(c.Request.Context(), func(q *db.Queries) error {
		var err error
		invoice, err = q.GetInvoice(c.Request.Context(), invoiceID)
		if err != nil {
			return err
		}

		txs, err = q.ListTransactionsByInvoice(c.Request.Context(), invoiceID)
		return err
	})

	if err != nil {
		httperr.HandleDBError(c, err, "Hóa đơn")
		return
	}

	res := invoiceDetailResponse{
		Invoice:      invoice,
		Transactions: txs,
	}

	response.Success(c, http.StatusOK, res, "Lấy thông tin hóa đơn thành công")
}

type listInvoicesRequest struct {
	PageID   int32   `form:"page_id" binding:"omitempty,min=1"`
	PageSize int32   `form:"page_size" binding:"omitempty,min=5,max=100"`
	Status   *string `form:"status" binding:"omitempty,oneof=UNPAID PARTIAL PAID OVERDUE"`
	OrderID  *string `form:"order_id" binding:"omitempty,uuid"`
}

// ListInvoices lấy danh sách hóa đơn chi nhánh (RLS tự động lọc)
func (h *InvoiceHandler) ListInvoices(c *gin.Context) {
	var req listInvoicesRequest
	if err := c.ShouldBindQuery(&req); err != nil {
		response.BadRequest(c, "Tham số truy vấn danh sách hóa đơn không hợp lệ", err.Error())
		return
	}

	if req.PageID == 0 {
		req.PageID = 1
	}
	if req.PageSize == 0 {
		req.PageSize = 10
	}

	offset := (req.PageID - 1) * req.PageSize
	var invoices []db.Invoice

	err := h.store.ExecTx(c.Request.Context(), func(q *db.Queries) error {
		var err error
		if req.OrderID != nil && *req.OrderID != "" {
			orderID, _ := uuid.Parse(*req.OrderID)
			invoices, err = q.ListInvoicesByOrder(c.Request.Context(), pgtype.UUID{Bytes: orderID, Valid: true})
		} else if req.Status != nil && *req.Status != "" {
			invoices, err = q.ListInvoicesByStatus(c.Request.Context(), db.ListInvoicesByStatusParams{
				Status: pgtype.Text{String: *req.Status, Valid: true},
				Limit:  req.PageSize,
				Offset: offset,
			})
		} else {
			invoices, err = q.ListInvoices(c.Request.Context(), db.ListInvoicesParams{
				Limit:  req.PageSize,
				Offset: offset,
			})
		}
		return err
	})

	if err != nil {
		httperr.HandleDBError(c, err, "Danh sách hóa đơn")
		return
	}

	response.Success(c, http.StatusOK, invoices, "Lấy danh sách hóa đơn thành công")
}

type createPaymentRequest struct {
	PaymentMethod string  `json:"payment_method" binding:"required,oneof=CASH BANK_TRANSFER INSTALLMENT"`
	Amount        string  `json:"amount" binding:"required"`
	ReferenceCode *string `json:"reference_code" binding:"omitempty,min=3"`
	Note          *string `json:"note"`
}

// CreatePaymentForInvoice ghi nhận thu tiền cho hóa đơn và tự động đồng bộ State Machine đơn hàng
// Hỗ trợ Idempotency qua reference_code và tính toán số học chuẩn xác tuyệt đối qua shopspring/decimal
func (h *InvoiceHandler) CreatePaymentForInvoice(c *gin.Context) {
	var uriReq getInvoiceRequest
	if err := c.ShouldBindUri(&uriReq); err != nil {
		response.BadRequest(c, "ID hóa đơn không hợp lệ", err.Error())
		return
	}

	var req createPaymentRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, "Dữ liệu thanh toán không hợp lệ", err.Error())
		return
	}

	payload, _ := middleware.GetAuthPayload(c)
	branchID := payload.BranchID
	if branchID == uuid.Nil {
		response.BadRequest(c, "Yêu cầu ngữ cảnh chi nhánh hợp lệ để thanh toán", nil)
		return
	}

	var paymentAmount pgtype.Numeric
	if err := paymentAmount.Scan(req.Amount); err != nil {
		response.BadRequest(c, "Số tiền thanh toán không hợp lệ", err.Error())
		return
	}

	invoiceID, _ := uuid.Parse(uriReq.ID)
	var createdTx db.Transaction
	var updatedInvoice db.Invoice

	// ACID Transaction với Khóa Bi Quan Chéo
	err := h.store.ExecTx(c.Request.Context(), func(q *db.Queries) error {
		// 1. Khóa bi quan Hóa đơn (SELECT ... FOR UPDATE)
		invoice, err := q.GetInvoiceForUpdate(c.Request.Context(), invoiceID)
		if err != nil {
			return err
		}

		if invoice.Status.String == domain.InvoiceStatusPaid {
			return domain.NewValidationError("hóa đơn này đã được thanh toán hoàn tất (PAID)")
		}

		// 2. Chuẩn bị Reference Code (Idempotency Key) & Ghi nhận giao dịch
		refCodeText := pgtype.Text{}
		if req.ReferenceCode != nil && *req.ReferenceCode != "" {
			refCodeText = pgtype.Text{String: *req.ReferenceCode, Valid: true}
		}

		noteText := pgtype.Text{}
		if req.Note != nil {
			noteText = pgtype.Text{String: *req.Note, Valid: true}
		}

		createdTx, err = q.CreateTransaction(c.Request.Context(), db.CreateTransactionParams{
			BranchID:      branchID,
			InvoiceID:     invoiceID,
			PaymentMethod: req.PaymentMethod,
			Amount:        paymentAmount,
			Status:        pgtype.Text{String: domain.TransactionStatusCompleted, Valid: true},
			Note:          noteText,
			ReferenceCode: refCodeText,
		})
		if err != nil {
			return fmt.Errorf("không thể ghi nhận giao dịch thanh toán: %w", err)
		}

		// 3. Tính tổng lũy kế thanh toán của hóa đơn bằng Decimal chính xác
		totalPaidInvoice, err := q.GetTotalPaidForInvoice(c.Request.Context(), db.GetTotalPaidForInvoiceParams{
			InvoiceID: invoiceID,
			BranchID:  branchID,
		})
		if err != nil {
			return fmt.Errorf("không thể tính tổng thanh toán hóa đơn: %w", err)
		}

		paidInvoiceDec := numericToDecimal(totalPaidInvoice)
		invAmountDec := numericToDecimal(invoice.Amount)

		newInvoiceStatus := domain.InvoiceStatusPartial
		if paidInvoiceDec.GreaterThanOrEqual(invAmountDec) {
			newInvoiceStatus = domain.InvoiceStatusPaid
		}

		updatedInvoice, err = q.UpdateInvoiceStatus(c.Request.Context(), db.UpdateInvoiceStatusParams{
			ID:     invoiceID,
			Status: pgtype.Text{String: newInvoiceStatus, Valid: true},
		})
		if err != nil {
			return fmt.Errorf("không thể cập nhật trạng thái hóa đơn: %w", err)
		}

		// 4. Đồng bộ trạng thái đơn hàng (Cross-Module State Synchronization)
		if invoice.OrderID.Valid {
			orderID := invoice.OrderID.Bytes
			order, err := q.GetSalesOrderForUpdate(c.Request.Context(), orderID)
			if err == nil && order.Status != domain.OrderStatusCancelled && order.Status != domain.OrderStatusDelivered {
				// Tính tổng số tiền đã thanh toán cho toàn bộ đơn hàng
				totalPaidOrder, err := q.GetTotalPaidForOrder(c.Request.Context(), db.GetTotalPaidForOrderParams{
					OrderID:  pgtype.UUID{Bytes: orderID, Valid: true},
					BranchID: branchID,
				})
				if err == nil {
					totalOrderPaidDec := numericToDecimal(totalPaidOrder)
					orderTotalDec := numericToDecimal(order.TotalAmount)
					orderDiscountDec := numericToDecimal(order.DiscountAmount)
					orderDepositDec := numericToDecimal(order.DepositAmount)
					netPayableDec := orderTotalDec.Sub(orderDiscountDec)

					// Tự động nhảy State Machine:
					// a. Đang DRAFT và đã đóng đủ cọc -> DEPOSIT_PAID
					if order.Status == domain.OrderStatusDraft && totalOrderPaidDec.GreaterThanOrEqual(orderDepositDec) && orderDepositDec.GreaterThan(decimal.Zero) {
						_, _ = q.UpdateSalesOrderStatus(c.Request.Context(), db.UpdateSalesOrderStatusParams{
							ID:     orderID,
							Status: domain.OrderStatusDepositPaid,
						})
					}

					// b. Đã thanh toán 100% giá trị hợp đồng -> FULL_PAID
					if (order.Status == domain.OrderStatusDraft || order.Status == domain.OrderStatusDepositPaid) && totalOrderPaidDec.GreaterThanOrEqual(netPayableDec) {
						_, _ = q.UpdateSalesOrderStatus(c.Request.Context(), db.UpdateSalesOrderStatusParams{
							ID:     orderID,
							Status: domain.OrderStatusFullPaid,
						})
					}
				}
			}
		}

		return nil
	})

	if err != nil {
		httperr.HandleDBError(c, err, "Thanh toán hóa đơn")
		return
	}

	res := gin.H{
		"transaction": createdTx,
		"invoice":     updatedInvoice,
	}

	response.Success(c, http.StatusCreated, res, "Ghi nhận thanh toán và cập nhật dòng tiền thành công")
}

type listTransactionsRequest struct {
	PageID    int32   `form:"page_id" binding:"omitempty,min=1"`
	PageSize  int32   `form:"page_size" binding:"omitempty,min=5,max=100"`
	InvoiceID *string `form:"invoice_id" binding:"omitempty,uuid"`
}

// ListTransactions lấy nhật ký giao dịch dòng tiền thực tế
func (h *InvoiceHandler) ListTransactions(c *gin.Context) {
	var req listTransactionsRequest
	if err := c.ShouldBindQuery(&req); err != nil {
		response.BadRequest(c, "Tham số truy vấn giao dịch không hợp lệ", err.Error())
		return
	}

	if req.PageID == 0 {
		req.PageID = 1
	}
	if req.PageSize == 0 {
		req.PageSize = 10
	}

	offset := (req.PageID - 1) * req.PageSize
	var txs []db.Transaction

	err := h.store.ExecTx(c.Request.Context(), func(q *db.Queries) error {
		var err error
		if req.InvoiceID != nil && *req.InvoiceID != "" {
			invID, _ := uuid.Parse(*req.InvoiceID)
			txs, err = q.ListTransactionsByInvoice(c.Request.Context(), invID)
		} else {
			txs, err = q.ListTransactions(c.Request.Context(), db.ListTransactionsParams{
				Limit:  req.PageSize,
				Offset: offset,
			})
		}
		return err
	})

	if err != nil {
		httperr.HandleDBError(c, err, "Nhật ký giao dịch")
		return
	}

	response.Success(c, http.StatusOK, txs, "Lấy danh sách giao dịch thành công")
}

func numericToDecimal(n pgtype.Numeric) decimal.Decimal {
	if !n.Valid {
		return decimal.Zero
	}
	v, err := n.Value()
	if err != nil || v == nil {
		return decimal.Zero
	}
	switch val := v.(type) {
	case string:
		d, err := decimal.NewFromString(val)
		if err != nil {
			return decimal.Zero
		}
		return d
	default:
		d, err := decimal.NewFromString(fmt.Sprintf("%v", val))
		if err != nil {
			return decimal.Zero
		}
		return d
	}
}
