package domain

import (
	"fmt"
	"strings"
)

// ValidationError đại diện cho các lỗi vi phạm quy tắc nghiệp vụ
type ValidationError struct {
	Message string
}

func (e *ValidationError) Error() string {
	return e.Message
}

func NewValidationError(format string, a ...interface{}) error {
	return &ValidationError{Message: fmt.Sprintf(format, a...)}
}

// Các hằng số trạng thái của đơn hàng bán xe
const (
	OrderStatusDraft       = "DRAFT"
	OrderStatusDepositPaid = "DEPOSIT_PAID"
	OrderStatusFullPaid    = "FULL_PAID"
	OrderStatusDelivered   = "DELIVERED"
	OrderStatusCancelled   = "CANCELLED"
)

// Các hằng số xử lý tiền cọc khi hủy đơn
const (
	DepositResolutionNone          = "NONE"
	DepositResolutionForfeited     = "FORFEITED"      // Tịch thu cọc (Ghi nhận Thu nhập khác)
	DepositResolutionPendingRefund = "PENDING_REFUND" // Chờ hoàn cọc (Kế toán duyệt chi)
	DepositResolutionCredited      = "CREDITED"       // Bảo lưu cọc cấn trừ đơn khác
	DepositResolutionRefunded      = "REFUNDED"       // Đã hoàn tiền cọc xong
)

// Các hằng số trạng thái của xe
const (
	VehicleStatusInTransit   = "IN_TRANSIT"
	VehicleStatusInStock     = "IN_STOCK"
	VehicleStatusReserved    = "RESERVED"
	VehicleStatusSold        = "SOLD"
	VehicleStatusMaintenance = "MAINTENANCE"
)

// Các hằng số trạng thái của Lead
const (
	LeadStatusNew       = "NEW"
	LeadStatusContacted = "CONTACTED"
	LeadStatusTestDrive = "TEST_DRIVE"
	LeadStatusQuoted    = "QUOTED"
	LeadStatusWon       = "WON"
	LeadStatusLost      = "LOST"
)

// allowedOrderTransitions định nghĩa ma trận chuyển đổi trạng thái đơn hàng nghiêm ngặt (Cấm nhảy cóc)
var allowedOrderTransitions = map[string][]string{
	OrderStatusDraft: {
		OrderStatusDepositPaid,
		OrderStatusCancelled,
	},
	OrderStatusDepositPaid: {
		OrderStatusFullPaid,
		OrderStatusCancelled,
	},
	OrderStatusFullPaid: {
		OrderStatusDelivered,
	},
	OrderStatusDelivered: {}, // Trạng thái kết thúc thành công
	OrderStatusCancelled: {}, // Trạng thái kết thúc hủy
}

// ValidateOrderTransition kiểm tra tính hợp lệ khi chuyển đổi trạng thái đơn hàng
func ValidateOrderTransition(currentStatus, nextStatus string) error {
	if currentStatus == nextStatus {
		return NewValidationError("đơn hàng đã ở trạng thái %s", currentStatus)
	}

	validNextStates, exists := allowedOrderTransitions[currentStatus]
	if !exists {
		return NewValidationError("trạng thái hiện tại không hợp lệ: %s", currentStatus)
	}

	for _, state := range validNextStates {
		if state == nextStatus {
			return nil
		}
	}

	return NewValidationError("không thể chuyển trạng thái đơn hàng từ '%s' sang '%s' (vi phạm quy trình bán hàng)", currentStatus, nextStatus)
}

// ValidateCancellation kiểm tra tính hợp lệ khi hủy đơn hàng và xử lý cọc
func ValidateCancellation(orderStatus string, hasDeposit bool, resolution string, reason string) error {
	if orderStatus == OrderStatusDelivered {
		return NewValidationError("không thể hủy đơn hàng đã hoàn tất bàn giao xe (DELIVERED)")
	}
	if orderStatus == OrderStatusCancelled {
		return NewValidationError("đơn hàng đã ở trạng thái hủy (CANCELLED) trước đó")
	}

	if strings.TrimSpace(reason) == "" || len(strings.TrimSpace(reason)) < 5 {
		return NewValidationError("lý do hủy đơn (cancel_reason) bắt buộc phải có ít nhất 5 ký tự")
	}

	validResolutions := map[string]bool{
		DepositResolutionNone:          true,
		DepositResolutionForfeited:     true,
		DepositResolutionPendingRefund: true,
		DepositResolutionCredited:      true,
	}

	if !validResolutions[resolution] {
		return NewValidationError("hướng giải quyết cọc (deposit_resolution) '%s' không hợp lệ", resolution)
	}

	// Nếu đơn hàng đã phát sinh tiền cọc (DEPOSIT_PAID hoặc FULL_PAID hoặc hasDeposit=true)
	if hasDeposit || orderStatus == OrderStatusDepositPaid || orderStatus == OrderStatusFullPaid {
		if resolution == DepositResolutionNone {
			return NewValidationError("đơn hàng đã phát sinh tiền cọc, bắt buộc phải chọn hướng giải quyết cọc (FORFEITED, PENDING_REFUND, hoặc CREDITED)")
		}
	} else if orderStatus == OrderStatusDraft && !hasDeposit {
		if resolution != DepositResolutionNone {
			return NewValidationError("đơn hàng nháp (DRAFT) chưa có cọc, hướng giải quyết cọc phải là 'NONE'")
		}
	}

	return nil
}

// GetVehicleStatusForOrderTransition xác định trạng thái xe tương ứng sau khi chuyển trạng thái đơn hàng
func GetVehicleStatusForOrderTransition(nextOrderStatus string) (string, bool) {
	switch nextOrderStatus {
	case OrderStatusCancelled:
		// Khi hủy đơn hàng, xe tự động được mở khóa hoàn về kho sẵn sàng bán
		return VehicleStatusInStock, true
	case OrderStatusDelivered:
		// Khi đã bàn giao xe thành công cho khách, xe chuyển sang Đã bán
		return VehicleStatusSold, true
	default:
		// Các trạng thái khác (DEPOSIT_PAID, FULL_PAID), xe tiếp tục giữ trạng thái RESERVED
		return "", false
	}
}
