package middleware

import (
	"strings"

	"erp-backend/internal/api/response"
	"erp-backend/internal/contextutil"
	"erp-backend/internal/token"

	"github.com/gin-gonic/gin"
)

// Typed string constants cho Gin Context Keys
type GinContextKey string

const (
	AuthorizationHeaderKey                = "authorization"
	AuthorizationTypeBearer               = "bearer"
	AuthorizationPayloadKey GinContextKey = "authorization_payload"
)

// AuthMiddleware xác thực JWT token từ Header Authorization: Bearer <token>
func AuthMiddleware(tokenMaker token.Maker) gin.HandlerFunc {
	return func(c *gin.Context) {
		authorizationHeader := c.GetHeader(AuthorizationHeaderKey)
		if len(authorizationHeader) == 0 {
			response.Unauthorized(c, "Yêu cầu cung cấp header Authorization")
			return
		}

		fields := strings.Fields(authorizationHeader)
		if len(fields) < 2 {
			response.Unauthorized(c, "Định dạng header Authorization không hợp lệ (cần Bearer <token>)")
			return
		}

		authorizationType := strings.ToLower(fields[0])
		if authorizationType != AuthorizationTypeBearer {
			response.Unauthorized(c, "Loại Authorization không được hỗ trợ (chỉ chấp nhận Bearer)")
			return
		}

		accessToken := fields[1]
		payload, err := tokenMaker.VerifyToken(accessToken)
		if err != nil {
			response.Unauthorized(c, "Token không hợp lệ hoặc đã hết hạn: "+err.Error())
			return
		}

		// 1. Lưu payload vào Gin Context với typed key
		c.Set(string(AuthorizationPayloadKey), payload)

		// 2. Đưa thông tin vào Go Request Context sử dụng unexported custom types (ngăn chặn key collision)
		ctx := contextutil.WithTenant(c.Request.Context(), payload.BranchID, payload.UserID, payload.Role)
		ctx = contextutil.WithAuthPayload(ctx, payload)
		c.Request = c.Request.WithContext(ctx)

		c.Next()
	}
}

// GetAuthPayload trích xuất Token Payload từ Gin Context
func GetAuthPayload(c *gin.Context) (*token.Payload, bool) {
	val, exists := c.Get(string(AuthorizationPayloadKey))
	if !exists {
		return nil, false
	}
	payload, ok := val.(*token.Payload)
	return payload, ok
}
