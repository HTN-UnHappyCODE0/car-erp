package sentryutil

import (
	"context"
	"errors"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"erp-backend/internal/config"
	"erp-backend/internal/contextutil"
	"erp-backend/internal/token"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

func TestInitSentry_DisabledWhenEmptyDSN(t *testing.T) {
	cfg := config.SentryConfig{
		DSN:              "",
		Environment:      "test",
		TracesSampleRate: 1.0,
	}

	enabled, err := InitSentry(cfg)
	if err != nil {
		t.Fatalf("InitSentry returned unexpected error: %v", err)
	}
	if enabled {
		t.Errorf("expected Sentry to be disabled when DSN is empty")
	}
}

func TestSentryMiddleware_NormalRequest(t *testing.T) {
	gin.SetMode(gin.TestMode)
	router := gin.New()
	router.Use(SentryMiddleware())

	router.GET("/ping", func(c *gin.Context) {
		c.String(http.StatusOK, "pong")
	})

	req, _ := http.NewRequest(http.MethodGet, "/ping", nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Errorf("expected status 200, got %d", w.Code)
	}
}

func TestSentryMiddleware_PanicRecovery(t *testing.T) {
	gin.SetMode(gin.TestMode)
	router := gin.New()
	router.Use(SentryMiddleware())

	router.GET("/panic", func(c *gin.Context) {
		userID := uuid.New()
		branchID := uuid.New()
		ctx := contextutil.WithTenant(c.Request.Context(), branchID, userID, "superadmin")
		ctx = contextutil.WithAuthPayload(ctx, &token.Payload{
			UserID:   userID,
			Username: "admin_test",
			Role:     "superadmin",
			BranchID: branchID,
		})
		c.Request = c.Request.WithContext(ctx)

		panic("critical unexpected test error")
	})

	req, _ := http.NewRequest(http.MethodGet, "/panic", nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusInternalServerError {
		t.Errorf("expected status 500 on panic recovery, got %d", w.Code)
	}
}

func TestCaptureError_NoPanic(t *testing.T) {
	ctx := context.Background()
	CaptureError(ctx, errors.New("sample error"), map[string]string{
		"module": "test",
	})
	Flush(100 * time.Millisecond)
}
