package middleware

import (
	"erp-backend/internal/api/response"
	"erp-backend/internal/contextutil"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

// TenantEnforcementMiddleware đảm bảo người dùng chỉ truy cập dữ liệu thuộc chi nhánh của mình
func TenantEnforcementMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		payload, ok := GetAuthPayload(c)
		if !ok || payload == nil {
			response.Unauthorized(c, "Yêu cầu xác thực tài khoản")
			return
		}

		activeBranchID := payload.BranchID

		// Nếu là superadmin và có truyền X-Branch-ID, cho phép switch ngữ cảnh branch
		branchHeader := c.GetHeader("X-Branch-ID")
		if payload.Role == "superadmin" && branchHeader != "" {
			reqBranchID, err := uuid.Parse(branchHeader)
			if err == nil && reqBranchID != uuid.Nil {
				activeBranchID = reqBranchID
			}
		} else if payload.Role != "superadmin" && branchHeader != "" {
			// Người dùng thường truyền X-Branch-ID không khớp với chi nhánh được cấp phép
			reqBranchID, err := uuid.Parse(branchHeader)
			if err == nil && reqBranchID != payload.BranchID {
				response.Forbidden(c, "Bạn không có quyền truy cập dữ liệu của chi nhánh khác")
				return
			}
		}

		// Cập nhật lại context với branch_id hợp lệ cuối cùng
		ctx := contextutil.WithTenant(c.Request.Context(), activeBranchID, payload.UserID, payload.Role)
		c.Request = c.Request.WithContext(ctx)

		c.Next()
	}
}
