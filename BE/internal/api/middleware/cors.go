package middleware

import (
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
)

// CORSMiddleware cấu hình CORS với danh sách whitelist origin linh hoạt.
// QUAN TRỌNG: Middleware này phải được đăng ký ĐẦU TIÊN trong pipeline của Gin.
func CORSMiddleware(allowedOrigins []string) gin.HandlerFunc {
	// Build origin lookup map (lowercase, no trailing slash)
	originSet := make(map[string]struct{}, len(allowedOrigins))
	allowAll := false

	for _, o := range allowedOrigins {
		clean := strings.ToLower(strings.TrimRight(strings.TrimSpace(o), "/"))
		if clean == "" {
			continue
		}
		if clean == "*" {
			allowAll = true
		}
		originSet[clean] = struct{}{}
	}

	return func(c *gin.Context) {
		origin := c.Request.Header.Get("Origin")
		cleanOrigin := strings.ToLower(strings.TrimRight(strings.TrimSpace(origin), "/"))

		allowed := isOriginAllowed(cleanOrigin, originSet, allowAll)

		// Luôn gắn CORS header nếu origin được phép
		if allowed {
			setCorHeaders(c, origin)
		}

		// Xử lý Preflight (OPTIONS): phải trả về trước khi tới các route handler
		if c.Request.Method == http.MethodOptions {
			if allowed {
				c.AbortWithStatus(http.StatusNoContent) // 204
			} else {
				c.AbortWithStatus(http.StatusForbidden) // 403
			}
			return
		}

		c.Next()
	}
}

func isOriginAllowed(origin string, originSet map[string]struct{}, allowAll bool) bool {
	if origin == "" {
		return false
	}
	if allowAll {
		return true
	}
	// Khớp chính xác
	if _, ok := originSet[origin]; ok {
		return true
	}
	// Tự động cho phép mọi subdomain của *.namhoanglegal.com (bao gồm https://carerp.namhoanglegal.com)
	if strings.HasSuffix(origin, ".namhoanglegal.com") {
		return true
	}
	// Wildcard pattern: *.example.com
	for o := range originSet {
		if strings.HasPrefix(o, "*.") {
			suffix := o[1:] // ".example.com"
			if strings.HasSuffix(origin, suffix) {
				return true
			}
		}
	}
	return false
}

func setCorHeaders(c *gin.Context, origin string) {
	h := c.Writer.Header()
	h.Set("Access-Control-Allow-Origin", origin)
	h.Set("Access-Control-Allow-Credentials", "true")
	h.Set("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS, HEAD")

	// Mirror back browser's requested headers (chuẩn nhất cho preflight)
	if reqH := c.Request.Header.Get("Access-Control-Request-Headers"); reqH != "" {
		h.Set("Access-Control-Allow-Headers", reqH)
	} else {
		h.Set("Access-Control-Allow-Headers",
			"Authorization, Content-Type, Accept, Origin, X-Requested-With, "+
				"X-CSRF-Token, Cache-Control, Content-Length, Accept-Encoding, "+
				"X-Branch-ID, X-Request-ID")
	}

	h.Set("Access-Control-Expose-Headers",
		"Content-Length, Access-Control-Allow-Origin, Access-Control-Allow-Headers, "+
			"Authorization, X-Branch-ID, X-Request-ID")
	h.Set("Access-Control-Max-Age", "86400")
	// Báo cho Nginx/CDN biết response thay đổi theo header Origin
	h.Add("Vary", "Origin")
}
