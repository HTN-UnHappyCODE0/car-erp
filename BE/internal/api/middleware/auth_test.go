package middleware

import (
	"fmt"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"erp-backend/internal/token"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

func addAuthorization(
	t *testing.T,
	request *http.Request,
	tokenMaker token.Maker,
	authorizationType string,
	userID uuid.UUID,
	employeeID uuid.UUID,
	username, role string,
	branchID uuid.UUID,
	duration time.Duration,
) {
	token, _, err := tokenMaker.CreateToken(userID, employeeID, username, role, branchID, duration)
	if err != nil {
		t.Fatalf("Không thể tạo token: %v", err)
	}

	authorizationHeader := fmt.Sprintf("%s %s", authorizationType, token)
	request.Header.Set(AuthorizationHeaderKey, authorizationHeader)
}

func TestAuthMiddleware(t *testing.T) {
	gin.SetMode(gin.TestMode)

	tokenMaker, err := token.NewJWTMaker("12345678901234567890123456789012")
	if err != nil {
		t.Fatalf("Không thể tạo token maker: %v", err)
	}

	userID := uuid.New()
	employeeID := uuid.New()
	branchID := uuid.New()

	testCases := []struct {
		name          string
		setupAuth     func(t *testing.T, request *http.Request, tokenMaker token.Maker)
		checkResponse func(t *testing.T, recorder *httptest.ResponseRecorder)
	}{
		{
			name: "OK",
			setupAuth: func(t *testing.T, request *http.Request, tokenMaker token.Maker) {
				addAuthorization(t, request, tokenMaker, AuthorizationTypeBearer, userID, employeeID, "testuser", "superadmin", branchID, time.Minute)
			},
			checkResponse: func(t *testing.T, recorder *httptest.ResponseRecorder) {
				if recorder.Code != http.StatusOK {
					t.Errorf("Kỳ vọng status 200 OK, nhận được: %d", recorder.Code)
				}
			},
		},
		{
			name: "NoAuthorization",
			setupAuth: func(t *testing.T, request *http.Request, tokenMaker token.Maker) {
			},
			checkResponse: func(t *testing.T, recorder *httptest.ResponseRecorder) {
				if recorder.Code != http.StatusUnauthorized {
					t.Errorf("Kỳ vọng status 401 Unauthorized, nhận được: %d", recorder.Code)
				}
			},
		},
		{
			name: "UnsupportedAuthorization",
			setupAuth: func(t *testing.T, request *http.Request, tokenMaker token.Maker) {
				addAuthorization(t, request, tokenMaker, "unsupported", userID, employeeID, "testuser", "superadmin", branchID, time.Minute)
			},
			checkResponse: func(t *testing.T, recorder *httptest.ResponseRecorder) {
				if recorder.Code != http.StatusUnauthorized {
					t.Errorf("Kỳ vọng status 401 Unauthorized, nhận được: %d", recorder.Code)
				}
			},
		},
		{
			name: "ExpiredToken",
			setupAuth: func(t *testing.T, request *http.Request, tokenMaker token.Maker) {
				addAuthorization(t, request, tokenMaker, AuthorizationTypeBearer, userID, employeeID, "testuser", "superadmin", branchID, -time.Minute)
			},
			checkResponse: func(t *testing.T, recorder *httptest.ResponseRecorder) {
				if recorder.Code != http.StatusUnauthorized {
					t.Errorf("Kỳ vọng status 401 Unauthorized, nhận được: %d", recorder.Code)
				}
			},
		},
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			server := gin.New()
			authPath := "/auth"
			server.GET(
				authPath,
				AuthMiddleware(tokenMaker),
				func(c *gin.Context) {
					c.JSON(http.StatusOK, gin.H{"status": "ok"})
				},
			)

			recorder := httptest.NewRecorder()
			request, err := http.NewRequest(http.MethodGet, authPath, nil)
			if err != nil {
				t.Fatalf("Không thể tạo request: %v", err)
			}

			tc.setupAuth(t, request, tokenMaker)
			server.ServeHTTP(recorder, request)
			tc.checkResponse(t, recorder)
		})
	}
}

func TestRBACMiddleware(t *testing.T) {
	gin.SetMode(gin.TestMode)

	tokenMaker, _ := token.NewJWTMaker("12345678901234567890123456789012")
	userID := uuid.New()
	employeeID := uuid.New()
	branchID := uuid.New()

	server := gin.New()
	server.GET(
		"/admin-only",
		AuthMiddleware(tokenMaker),
		RequireRoles("superadmin", "branch_manager"),
		func(c *gin.Context) {
			c.JSON(http.StatusOK, gin.H{"status": "admin_granted"})
		},
	)

	// Case 1: salesperson -> 403 Forbidden
	req1, _ := http.NewRequest(http.MethodGet, "/admin-only", nil)
	addAuthorization(t, req1, tokenMaker, AuthorizationTypeBearer, userID, employeeID, "sales", "salesperson", branchID, time.Minute)
	rec1 := httptest.NewRecorder()
	server.ServeHTTP(rec1, req1)
	if rec1.Code != http.StatusForbidden {
		t.Errorf("Kỳ vọng 403 Forbidden cho salesperson, nhận được: %d", rec1.Code)
	}

	// Case 2: branch_manager -> 200 OK
	req2, _ := http.NewRequest(http.MethodGet, "/admin-only", nil)
	addAuthorization(t, req2, tokenMaker, AuthorizationTypeBearer, userID, employeeID, "manager", "branch_manager", branchID, time.Minute)
	rec2 := httptest.NewRecorder()
	server.ServeHTTP(rec2, req2)
	if rec2.Code != http.StatusOK {
		t.Errorf("Kỳ vọng 200 OK cho branch_manager, nhận được: %d", rec2.Code)
	}
}

func TestSecurityHeadersAndCORSMiddleware(t *testing.T) {
	gin.SetMode(gin.TestMode)

	allowedOrigins := []string{"http://localhost:3000", "https://erp.example.com"}
	server := gin.New()
	server.Use(SecurityHeadersMiddleware())
	server.Use(CORSMiddleware(allowedOrigins))

	server.GET("/test", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"status": "ok"})
	})

	// Test 1: Security Headers
	req1, _ := http.NewRequest(http.MethodGet, "/test", nil)
	rec1 := httptest.NewRecorder()
	server.ServeHTTP(rec1, req1)

	if rec1.Header().Get("X-Frame-Options") != "DENY" {
		t.Errorf("Kỳ vọng X-Frame-Options: DENY, nhận được: %s", rec1.Header().Get("X-Frame-Options"))
	}
	if rec1.Header().Get("X-Content-Type-Options") != "nosniff" {
		t.Errorf("Kỳ vọng X-Content-Type-Options: nosniff, nhận được: %s", rec1.Header().Get("X-Content-Type-Options"))
	}

	// Test 2: Whitelisted Origin
	req2, _ := http.NewRequest(http.MethodGet, "/test", nil)
	req2.Header.Set("Origin", "http://localhost:3000")
	rec2 := httptest.NewRecorder()
	server.ServeHTTP(rec2, req2)

	if rec2.Header().Get("Access-Control-Allow-Origin") != "http://localhost:3000" {
		t.Errorf("Kỳ vọng Access-Control-Allow-Origin: http://localhost:3000, nhận được: %s", rec2.Header().Get("Access-Control-Allow-Origin"))
	}
	if rec2.Header().Get("Access-Control-Allow-Credentials") != "true" {
		t.Errorf("Kỳ vọng Access-Control-Allow-Credentials: true")
	}

	// Test 3: Malicious / Non-whitelisted Origin
	req3, _ := http.NewRequest(http.MethodGet, "/test", nil)
	req3.Header.Set("Origin", "https://malicious-site.com")
	rec3 := httptest.NewRecorder()
	server.ServeHTTP(rec3, req3)

	if rec3.Header().Get("Access-Control-Allow-Origin") != "" {
		t.Errorf("Kỳ vọng không cấp Access-Control-Allow-Origin cho malicious origin, nhưng nhận được: %s", rec3.Header().Get("Access-Control-Allow-Origin"))
	}
}
