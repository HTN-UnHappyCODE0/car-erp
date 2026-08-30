package response

import (
	"net/http"

	"github.com/gin-gonic/gin"
)

// StandardResponse là cấu trúc chuẩn cho mọi JSON response trả về từ hệ thống
type StandardResponse struct {
	Success bool        `json:"success"`
	Data    interface{} `json:"data,omitempty"`
	Error   interface{} `json:"error,omitempty"`
	Message string      `json:"message,omitempty"`
}

// Success trả về phản hồi thành công (200 OK hoặc tùy chỉnh)
func Success(c *gin.Context, statusCode int, data interface{}, message string) {
	c.JSON(statusCode, StandardResponse{
		Success: true,
		Data:    data,
		Message: message,
	})
}

// Error trả về phản hồi lỗi
func Error(c *gin.Context, statusCode int, message string, errDetails interface{}) {
	c.AbortWithStatusJSON(statusCode, StandardResponse{
		Success: false,
		Error:   errDetails,
		Message: message,
	})
}

// BadRequest trả về lỗi 400 Bad Request
func BadRequest(c *gin.Context, message string, errDetails interface{}) {
	Error(c, http.StatusBadRequest, message, errDetails)
}

// Unauthorized trả về lỗi 401 Unauthorized
func Unauthorized(c *gin.Context, message string) {
	Error(c, http.StatusUnauthorized, message, nil)
}

// Forbidden trả về lỗi 403 Forbidden
func Forbidden(c *gin.Context, message string) {
	Error(c, http.StatusForbidden, message, nil)
}

// NotFound trả về lỗi 404 Not Found
func NotFound(c *gin.Context, message string) {
	Error(c, http.StatusNotFound, message, nil)
}

// InternalServerError trả về lỗi 500 Internal Server Error và tự động ẩn chi tiết lỗi DB ở Production
func InternalServerError(c *gin.Context, message string, errDetails interface{}) {
	// Ở môi trường Production, không để lộ raw error (SQL query, DB constraints) ra ngoài client
	if gin.Mode() == gin.ReleaseMode {
		Error(c, http.StatusInternalServerError, message, "Đã có lỗi xử lý xảy ra trên hệ thống. Vui lòng liên hệ bộ phận hỗ trợ kỹ thuật.")
		return
	}

	Error(c, http.StatusInternalServerError, message, errDetails)
}
