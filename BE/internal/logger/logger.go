package logger

import (
	"log/slog"
	"os"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

// InitLogger khởi tạo Logger có cấu trúc (Structured JSON Logger)
func InitLogger(env string) *slog.Logger {
	var handler slog.Handler
	opts := &slog.HandlerOptions{
		Level: slog.LevelInfo,
	}

	if env == "development" {
		opts.Level = slog.LevelDebug
	}

	handler = slog.NewJSONHandler(os.Stdout, opts)
	logger := slog.New(handler)
	slog.SetDefault(logger)
	return logger
}

const RequestIDKey = "request_id"

// StructuredLoggerMiddleware ghi log chi tiết cho từng HTTP Request theo chuẩn JSON
func StructuredLoggerMiddleware(logger *slog.Logger) gin.HandlerFunc {
	return func(c *gin.Context) {
		start := time.Now()
		path := c.Request.URL.Path
		rawQuery := c.Request.URL.RawQuery

		// Tạo hoặc lấy Request ID để truy vết phân tán (Distributed Tracing)
		requestID := c.GetHeader("X-Request-ID")
		if requestID == "" {
			requestID = uuid.New().String()
		}
		c.Set(RequestIDKey, requestID)
		c.Writer.Header().Set("X-Request-ID", requestID)

		// Xử lý request
		c.Next()

		latency := time.Since(start)
		statusCode := c.Writer.Status()
		clientIP := c.ClientIP()
		method := c.Request.Method
		userAgent := c.Request.UserAgent()
		errorMessage := c.Errors.ByType(gin.ErrorTypePrivate).String()

		fields := []slog.Attr{
			slog.String("request_id", requestID),
			slog.String("method", method),
			slog.String("path", path),
			slog.String("query", rawQuery),
			slog.Int("status", statusCode),
			slog.Duration("latency", latency),
			slog.Int64("latency_ms", latency.Milliseconds()),
			slog.String("client_ip", clientIP),
			slog.String("user_agent", userAgent),
		}

		if errorMessage != "" {
			fields = append(fields, slog.String("error", errorMessage))
		}

		// Ghi log theo cấp độ HTTP status code
		if statusCode >= 500 {
			logger.LogAttrs(c.Request.Context(), slog.LevelError, "HTTP Server Error", fields...)
		} else if statusCode >= 400 {
			logger.LogAttrs(c.Request.Context(), slog.LevelWarn, "HTTP Client Error", fields...)
		} else {
			logger.LogAttrs(c.Request.Context(), slog.LevelInfo, "HTTP Request Processed", fields...)
		}
	}
}
