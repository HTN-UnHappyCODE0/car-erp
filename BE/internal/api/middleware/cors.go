package middleware

import (
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
)

// CORSMiddleware cấu hình Cross-Origin Resource Sharing an toàn dựa trên Whitelist domain
func CORSMiddleware(allowedOrigins []string) gin.HandlerFunc {
	// Chuyển allowedOrigins thành map để tra cứu O(1)
	originMap := make(map[string]bool)
	allowAll := false

	for _, o := range allowedOrigins {
		trimmed := strings.TrimSpace(o)
		if trimmed == "*" {
			allowAll = true
		}
		originMap[trimmed] = true
	}

	return func(c *gin.Context) {
		origin := c.Request.Header.Get("Origin")

		isAllowed := false
		if origin != "" {
			if allowAll || originMap[origin] {
				isAllowed = true
			}
		}

		if isAllowed {
			c.Writer.Header().Set("Access-Control-Allow-Origin", origin)
			c.Writer.Header().Set("Access-Control-Allow-Credentials", "true")
			c.Writer.Header().Set("Access-Control-Allow-Headers", "Authorization, Content-Type, Content-Length, Accept-Encoding, X-CSRF-Token, Accept, Origin, Cache-Control, X-Requested-With, X-Branch-ID, X-Request-ID")
			c.Writer.Header().Set("Access-Control-Allow-Methods", "POST, OPTIONS, GET, PUT, PATCH, DELETE, HEAD")
			c.Writer.Header().Set("Access-Control-Expose-Headers", "Content-Length, Access-Control-Allow-Origin, Access-Control-Allow-Headers, Authorization, X-Branch-ID, X-Request-ID")
			c.Writer.Header().Set("Access-Control-Max-Age", "86400") // Cache preflight 24h
		}

		// Xử lý Preflight Request (OPTIONS)
		if c.Request.Method == http.MethodOptions {
			if isAllowed {
				c.AbortWithStatus(http.StatusNoContent)
			} else {
				c.AbortWithStatus(http.StatusForbidden)
			}
			return
		}

		c.Next()
	}
}
