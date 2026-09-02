package sentryutil

import (
	"context"
	"fmt"
	"log/slog"
	"net/http"
	"strings"
	"time"

	"erp-backend/internal/config"
	"erp-backend/internal/contextutil"
	"erp-backend/internal/token"

	"github.com/getsentry/sentry-go"
	"github.com/gin-gonic/gin"
)

// InitSentry khởi tạo Sentry Client cho Go Backend với cơ chế an toàn
func InitSentry(cfg config.SentryConfig) (bool, error) {
	if strings.TrimSpace(cfg.DSN) == "" {
		slog.Info("[Sentry] SENTRY_DSN để trống, hệ thống chạy ở chế độ Disabled (không gửi telemetry)")
		return false, nil
	}

	err := sentry.Init(sentry.ClientOptions{
		Dsn:              cfg.DSN,
		Environment:      cfg.Environment,
		TracesSampleRate: cfg.TracesSampleRate,
		AttachStacktrace: cfg.AttachStacktrace,
		BeforeSend: func(event *sentry.Event, hint *sentry.EventHint) *sentry.Event {
			// Lọc và làm sạch dữ liệu nhạy cảm trước khi gửi lên Sentry
			if event.Request != nil {
				// Xóa Bearer token trong Authorization header
				if event.Request.Headers != nil {
					if auth, ok := event.Request.Headers["Authorization"]; ok {
						if strings.HasPrefix(auth, "Bearer ") {
							event.Request.Headers["Authorization"] = "Bearer [REDACTED]"
						}
					}
					if _, ok := event.Request.Headers["Cookie"]; ok {
						event.Request.Headers["Cookie"] = "[REDACTED]"
					}
				}
			}
			return event
		},
	})

	if err != nil {
		return false, fmt.Errorf("không thể khởi tạo Sentry: %w", err)
	}

	slog.Info("[Sentry] Đã kết nối và kích hoạt Sentry giám sát lỗi",
		slog.String("environment", cfg.Environment),
		slog.Float64("traces_sample_rate", cfg.TracesSampleRate),
	)

	return true, nil
}

// SentryMiddleware tích hợp Sentry vào Gin pipeline: bắt Panic, ghi nhận Context người dùng và HTTP 500
func SentryMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		hub := sentry.CurrentHub().Clone()
		if hub == nil {
			c.Next()
			return
		}

		ctx := sentry.SetHubOnContext(c.Request.Context(), hub)
		c.Request = c.Request.WithContext(ctx)

		hub.Scope().SetRequest(c.Request)

		// Gắn các thông tin phân loại request
		requestID := c.GetString("request_id")
		if requestID != "" {
			hub.Scope().SetTag("request_id", requestID)
		}

		// Bắt Panic nếu có
		defer func() {
			if r := recover(); r != nil {
				err, ok := r.(error)
				if !ok {
					err = fmt.Errorf("%v", r)
				}

				enrichScopeWithAuthContext(hub.Scope(), c)
				hub.CaptureException(err)
				sentry.Flush(2 * time.Second)

				slog.ErrorContext(c.Request.Context(), "Unhandled Panic recovered by SentryMiddleware",
					slog.Any("panic", r),
					slog.String("path", c.Request.URL.Path),
					slog.String("request_id", requestID),
				)

				c.AbortWithStatusJSON(http.StatusInternalServerError, gin.H{
					"success": false,
					"error":   "Hệ thống gặp sự cố không mong muốn. Mã sự cố đã được ghi nhận.",
					"code":    "INTERNAL_SERVER_ERROR",
				})
			}
		}()

		c.Next()

		// Nếu response trả về mã lỗi 500 trở lên, tự động ghi nhận vào Sentry
		statusCode := c.Writer.Status()
		if statusCode >= 500 {
			enrichScopeWithAuthContext(hub.Scope(), c)

			var errMessage string
			if len(c.Errors) > 0 {
				errMessage = c.Errors.String()
			} else {
				errMessage = fmt.Sprintf("HTTP %d on %s %s", statusCode, c.Request.Method, c.Request.URL.Path)
			}

			hub.CaptureMessage(errMessage)
		}
	}
}

func enrichScopeWithAuthContext(scope *sentry.Scope, c *gin.Context) {
	ctx := c.Request.Context()

	if val, err := contextutil.GetAuthPayload(ctx); err == nil && val != nil {
		if payload, ok := val.(*token.Payload); ok && payload != nil {
			scope.SetUser(sentry.User{
				ID:       payload.UserID.String(),
				Username: payload.Username,
			})
			scope.SetTag("user.role", payload.Role)
			scope.SetTag("tenant.branch_id", payload.BranchID.String())
			return
		}
	}

	if userID, err := contextutil.GetUserID(ctx); err == nil {
		scope.SetUser(sentry.User{
			ID: userID.String(),
		})
	}
	if role, err := contextutil.GetUserRole(ctx); err == nil {
		scope.SetTag("user.role", role)
	}
	if branchID, err := contextutil.GetBranchID(ctx); err == nil {
		scope.SetTag("tenant.branch_id", branchID.String())
	}
}

// CaptureError ghi nhận thủ công một lỗi nghiệp vụ với ngữ cảnh chi tiết
func CaptureError(ctx context.Context, err error, tags map[string]string) {
	if err == nil {
		return
	}
	hub := sentry.GetHubFromContext(ctx)
	if hub == nil {
		hub = sentry.CurrentHub()
	}
	if hub == nil {
		return
	}

	hub.WithScope(func(scope *sentry.Scope) {
		for k, v := range tags {
			scope.SetTag(k, v)
		}
		hub.CaptureException(err)
	})
}

// Flush đảm bảo toàn bộ event được gửi lên Sentry server trước khi tắt app
func Flush(timeout time.Duration) {
	sentry.Flush(timeout)
}
