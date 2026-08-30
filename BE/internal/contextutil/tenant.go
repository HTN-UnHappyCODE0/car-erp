package contextutil

import (
	"context"
	"errors"

	"github.com/google/uuid"
)

// contextKey là kiểu định danh nội bộ (unexported) ngăn ngừa xung đột key giữa các package trong Go
type contextKey int

const (
	branchIDKey contextKey = iota
	userIDKey
	userRoleKey
	authPayloadKey
)

var (
	ErrBranchIDNotFound = errors.New("không tìm thấy branch_id trong context")
	ErrUserIDNotFound   = errors.New("không tìm thấy user_id trong context")
	ErrUserRoleNotFound = errors.New("không tìm thấy user_role trong context")
	ErrPayloadNotFound  = errors.New("không tìm thấy auth_payload trong context")
)

// WithTenant gán thông tin Branch ID, User ID và User Role vào Go Request Context
func WithTenant(ctx context.Context, branchID, userID uuid.UUID, role string) context.Context {
	ctx = context.WithValue(ctx, branchIDKey, branchID)
	ctx = context.WithValue(ctx, userIDKey, userID)
	return context.WithValue(ctx, userRoleKey, role)
}

// WithAuthPayload gán trọn vẹn object Payload vào Go Request Context
func WithAuthPayload(ctx context.Context, payload interface{}) context.Context {
	return context.WithValue(ctx, authPayloadKey, payload)
}

// GetBranchID trích xuất Branch ID từ context
func GetBranchID(ctx context.Context) (uuid.UUID, error) {
	val := ctx.Value(branchIDKey)
	if branchID, ok := val.(uuid.UUID); ok && branchID != uuid.Nil {
		return branchID, nil
	}
	return uuid.Nil, ErrBranchIDNotFound
}

// GetUserID trích xuất User ID từ context
func GetUserID(ctx context.Context) (uuid.UUID, error) {
	val := ctx.Value(userIDKey)
	if userID, ok := val.(uuid.UUID); ok && userID != uuid.Nil {
		return userID, nil
	}
	return uuid.Nil, ErrUserIDNotFound
}

// GetUserRole trích xuất User Role từ context
func GetUserRole(ctx context.Context) (string, error) {
	val := ctx.Value(userRoleKey)
	if role, ok := val.(string); ok && role != "" {
		return role, nil
	}
	return "", ErrUserRoleNotFound
}

// GetAuthPayload trích xuất Auth Payload từ Go Request Context
func GetAuthPayload(ctx context.Context) (interface{}, error) {
	val := ctx.Value(authPayloadKey)
	if val != nil {
		return val, nil
	}
	return nil, ErrPayloadNotFound
}
