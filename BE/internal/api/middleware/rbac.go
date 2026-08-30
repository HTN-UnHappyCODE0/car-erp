package middleware

import (
	"erp-backend/internal/api/response"

	"github.com/gin-gonic/gin"
)

// RequireRoles kiểm tra xem Role của user có nằm trong danh sách được cấp phép không
func RequireRoles(allowedRoles ...string) gin.HandlerFunc {
	return func(c *gin.Context) {
		payload, ok := GetAuthPayload(c)
		if !ok || payload == nil {
			response.Unauthorized(c, "Yêu cầu đăng nhập trước khi thực hiện hành động này")
			return
		}

		// Superadmin luôn có quyền truy cập tất cả
		if payload.Role == "superadmin" {
			c.Next()
			return
		}

		// Kiểm tra role của user
		hasPermission := false
		for _, role := range allowedRoles {
			if payload.Role == role {
				hasPermission = true
				break
			}
		}

		if !hasPermission {
			response.Forbidden(c, "Bạn không có quyền thực hiện chức năng này")
			return
		}

		c.Next()
	}
}
