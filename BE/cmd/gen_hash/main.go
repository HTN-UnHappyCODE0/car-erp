//go:build ignore

// Script này chạy một lần để tạo bcrypt hash cho mật khẩu và cập nhật vào DB.
// Chạy: go run ./cmd/gen_hash/main.go
package main

import (
	"context"
	"fmt"
	"log"
	"time"

	"erp-backend/internal/config"
	"erp-backend/internal/database"
	"erp-backend/internal/util"
)

func main() {
	password := "Admin@123"

	// 1. Sinh bcrypt hash
	hash, err := util.HashPassword(password)
	if err != nil {
		log.Fatalf("Lỗi HashPassword: %v", err)
	}
	fmt.Printf("✅ Password: %s\n", password)
	fmt.Printf("✅ Bcrypt Hash: %s\n\n", hash)

	// 2. Kết nối DB và cập nhật
	cfg := config.LoadConfig()
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	pgPool, err := database.NewPostgresPool(ctx, cfg.Database)
	if err != nil {
		log.Fatalf("Lỗi kết nối DB: %v", err)
	}
	defer pgPool.Close()

	// 3. Update password_hash cho user 'admin'
	tag, err := pgPool.Pool.Exec(ctx,
		"UPDATE users SET password_hash = $1 WHERE username = 'admin'",
		hash,
	)
	if err != nil {
		log.Fatalf("Lỗi UPDATE: %v", err)
	}

	if tag.RowsAffected() == 0 {
		log.Fatal("❌ Không tìm thấy user 'admin' trong DB. Hãy kiểm tra lại.")
	}

	fmt.Printf("✅ Đã cập nhật password_hash cho user 'admin' thành công! (%d row affected)\n", tag.RowsAffected())
	fmt.Println("👉 Bây giờ đăng nhập với: username=admin / password=Admin@123")
}
