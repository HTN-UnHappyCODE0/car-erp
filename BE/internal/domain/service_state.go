package domain

import (
	"strings"
)

// Các hằng số trạng thái của Lệnh Sửa Chữa (Repair Orders)
const (
	RepairOrderStatusOpen       = "OPEN"
	RepairOrderStatusInProgress = "IN_PROGRESS"
	RepairOrderStatusCompleted  = "COMPLETED"
	RepairOrderStatusInvoiced   = "INVOICED"
)

// Các loại hạng mục trong lệnh sửa chữa
const (
	ItemTypePart  = "PART"  // Phụ tùng / Linh kiện xuất kho
	ItemTypeLabor = "LABOR" // Tiền công thợ
)

// Ma trận chuyển đổi trạng thái hợp lệ của Lệnh Sửa Chữa
var allowedServiceTransitions = map[string][]string{
	RepairOrderStatusOpen: {
		RepairOrderStatusInProgress,
		RepairOrderStatusCompleted,
	},
	RepairOrderStatusInProgress: {
		RepairOrderStatusCompleted,
	},
	RepairOrderStatusCompleted: {
		RepairOrderStatusInvoiced,
	},
	RepairOrderStatusInvoiced: {}, // Trạng thái kết thúc
}

// ValidateServiceTransition kiểm tra tính hợp lệ của việc chuyển trạng thái lệnh sửa chữa
func ValidateServiceTransition(currentStatus, newStatus string) error {
	if currentStatus == newStatus {
		return nil
	}

	validNextStates, exists := allowedServiceTransitions[currentStatus]
	if !exists {
		return NewValidationError("trạng thái hiện tại '%s' không xác định", currentStatus)
	}

	for _, state := range validNextStates {
		if state == newStatus {
			return nil
		}
	}

	return NewValidationError("không thể chuyển trạng thái lệnh sửa chữa từ '%s' sang '%s' (vi phạm quy trình xưởng)", currentStatus, newStatus)
}

// ValidateOdometer kiểm tra tính toàn vẹn của số Kilomet (chống tua lùi ODO)
// Cho phép Branch Manager / Superadmin bypass kèm theo lý do giải trình khi Cố vấn dịch vụ gõ nhầm
func ValidateOdometer(latestOdo, newOdo int32, isOverride bool, overrideReason string, userRole string) error {
	if newOdo <= 0 {
		return NewValidationError("số Kilomet (odometer) phải lớn hơn 0")
	}

	if latestOdo > 0 && newOdo < latestOdo {
		if !isOverride {
			return NewValidationError("số ODO mới (%d km) không được nhỏ hơn số ODO lần bảo dưỡng trước (%d km). Nếu do gõ nhầm lần trước, vui lòng nhờ Quản lý chi nhánh (Branch Manager) phê duyệt với lý do giải trình.", newOdo, latestOdo)
		}

		// Luồng bypass: Kiểm tra thẩm quyền
		if userRole != "superadmin" && userRole != "branch_manager" {
			return NewValidationError("chỉ Quản lý chi nhánh (Branch Manager) hoặc Superadmin mới có quyền phê duyệt ghi đè số ODO")
		}

		if len(strings.TrimSpace(overrideReason)) < 10 {
			return NewValidationError("lý do ghi đè số ODO bắt buộc phải có ít nhất 10 ký tự giải trình")
		}
	}

	return nil
}

// ValidateItemModification kiểm tra quyền thêm / sửa / xóa vật tư và công thợ
func ValidateItemModification(orderStatus string) error {
	if orderStatus == RepairOrderStatusCompleted || orderStatus == RepairOrderStatusInvoiced {
		return NewValidationError("không thể chỉnh sửa danh mục vật tư/công thợ khi lệnh sửa chữa đã ở trạng thái '%s'", orderStatus)
	}
	return nil
}
