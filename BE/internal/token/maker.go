package token

import (
	"time"

	"github.com/google/uuid"
)

// Maker là interface quản lý việc tạo và xác thực Token
type Maker interface {
	// CreateToken tạo ra một token mới cho một user cụ thể với thời hạn duration
	CreateToken(userID, employeeID uuid.UUID, username, role string, branchID uuid.UUID, duration time.Duration) (string, *Payload, error)

	// VerifyToken kiểm tra xem token có hợp lệ không và trả về payload
	VerifyToken(token string) (*Payload, error)
}
