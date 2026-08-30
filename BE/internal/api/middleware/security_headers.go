package middleware

import "github.com/gin-gonic/gin"

// SecurityHeadersMiddleware gắn các HTTP Security Headers tiêu chuẩn để bảo vệ hệ thống
func SecurityHeadersMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		// Chống Clickjacking: ngăn không cho website khác nhúng trang ERP vào <iframe>
		c.Writer.Header().Set("X-Frame-Options", "DENY")

		// Chống MIME-sniffing: ép trình duyệt tuân thủ đúng MIME type được khai báo
		c.Writer.Header().Set("X-Content-Type-Options", "nosniff")

		// Bật bộ lọc XSS tích hợp của trình duyệt
		c.Writer.Header().Set("X-XSS-Protection", "1; mode=block")

		// Kiểm soát thông tin Referrer khi chuyển hướng
		c.Writer.Header().Set("Referrer-Policy", "strict-origin-when-cross-origin")

		// Khóa các tính năng nhạy cảm không sử dụng (Permissions Policy)
		c.Writer.Header().Set("Permissions-Policy", "camera=(), microphone=(), geolocation=(), payment=()")

		c.Next()
	}
}
