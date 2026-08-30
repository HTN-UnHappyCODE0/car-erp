package token

import (
	"errors"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
)

var (
	ErrInvalidToken = errors.New("token không hợp lệ")
	ErrExpiredToken = errors.New("token đã hết hạn")
)

// Payload chứa toàn bộ dữ liệu payload của một Token
type Payload struct {
	ID         uuid.UUID `json:"id"`
	UserID     uuid.UUID `json:"user_id"`     // ID tài khoản (users.id)
	EmployeeID uuid.UUID `json:"employee_id"` // ID hồ sơ nhân viên (employees.id)
	Username   string    `json:"username"`
	Role       string    `json:"role"`
	BranchID   uuid.UUID `json:"branch_id"`
	jwt.RegisteredClaims
}

// NewPayload tạo một token payload mới với thời hạn xác định
func NewPayload(userID, employeeID uuid.UUID, username, role string, branchID uuid.UUID, duration time.Duration) (*Payload, error) {
	tokenID, err := uuid.NewRandom()
	if err != nil {
		return nil, err
	}

	now := time.Now()
	payload := &Payload{
		ID:         tokenID,
		UserID:     userID,
		EmployeeID: employeeID,
		Username:   username,
		Role:       role,
		BranchID:   branchID,
		RegisteredClaims: jwt.RegisteredClaims{
			ID:        tokenID.String(),
			Subject:   username,
			IssuedAt:  jwt.NewNumericDate(now),
			ExpiresAt: jwt.NewNumericDate(now.Add(duration)),
		},
	}

	return payload, nil
}
