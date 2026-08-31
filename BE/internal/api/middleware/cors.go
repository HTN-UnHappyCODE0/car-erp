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
		trimmed = strings.TrimRight(trimmed, "/")
		if trimmed == "*" {
			allowAll = true
		}
		if trimmed != "" {
			originMap[trimmed] = true
		}
	}

	return func(c *gin.Context) {
		origin := c.Request.Header.Get("Origin")
		cleanOrigin := strings.TrimRight(strings.TrimSpace(origin), "/")

		isAllowed := false
		if cleanOrigin != "" {
			if allowAll || originMap[cleanOrigin] {
				isAllowed = true
			} else {
				// Hỗ trợ kiểm tra wildcard subdomains như *.namhoanglegal.com
				for allowed := range originMap {
					if strings.HasPrefix(allowed, "*.") {
						suffix := allowed[1:]
						if strings.HasSuffix(cleanOrigin, suffix) {
							isAllowed = true
							break
						}
					}
				}
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
