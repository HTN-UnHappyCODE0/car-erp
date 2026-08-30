package util

import (
	"fmt"

	"golang.org/x/crypto/bcrypt"
)

// HashPassword băm mật khẩu thô bằng thuật toán bcrypt
func HashPassword(password string) (string, error) {
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	if err != nil {
		return "", fmt.Errorf("không thể băm mật khẩu: %w", err)
	}
	return string(hashedPassword), nil
}

// CheckPassword kiểm tra xem mật khẩu cung cấp có khớp với chuỗi đã băm hay không
func CheckPassword(password, hashedPassword string) error {
	return bcrypt.CompareHashAndPassword([]byte(hashedPassword), []byte(password))
}
