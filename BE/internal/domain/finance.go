package domain

// Các hằng số trạng thái của Hóa đơn (Invoices)
const (
	InvoiceStatusUnpaid  = "UNPAID"
	InvoiceStatusPartial = "PARTIAL"
	InvoiceStatusPaid    = "PAID"
	InvoiceStatusOverdue = "OVERDUE"
)

// Các phương thức thanh toán dòng tiền thực tế
const (
	PaymentMethodCash         = "CASH"
	PaymentMethodBankTransfer = "BANK_TRANSFER"
	PaymentMethodInstallment  = "INSTALLMENT"
)

// Các trạng thái của Giao dịch thanh toán (Transactions)
const (
	TransactionStatusCompleted = "COMPLETED"
	TransactionStatusFailed    = "FAILED"
	TransactionStatusRefunded  = "REFUNDED"
)
