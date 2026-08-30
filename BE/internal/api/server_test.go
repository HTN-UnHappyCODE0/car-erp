package api

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"os"
	"testing"
	"time"

	"erp-backend/db/sqlc"
	"erp-backend/internal/api/middleware"
	"erp-backend/internal/config"
	"erp-backend/internal/database"
	"erp-backend/internal/token"
	"erp-backend/internal/util"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgtype"
)

var testServer *Server
var testStore db.Store
var testTokenMaker token.Maker

func TestMain(m *testing.M) {
	gin.SetMode(gin.TestMode)

	cfg := config.LoadConfig()
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	pgPool, err := database.NewPostgresPool(ctx, cfg.Database)
	if err != nil {
		fmt.Printf("Bỏ qua integration test nếu không thể kết nối DB: %v\n", err)
		os.Exit(0)
	}
	defer pgPool.Close()

	testStore = db.NewStore(pgPool.Pool)

	testTokenMaker, err = token.NewJWTMaker(cfg.TokenSymmetricKey)
	if err != nil {
		panic(err)
	}

	testServer, err = NewServer(cfg, testStore, testTokenMaker, pgPool)
	if err != nil {
		panic(err)
	}

	os.Exit(m.Run())
}

func addAuthHeader(t *testing.T, req *http.Request, userID, employeeID uuid.UUID, username, role string, branchID uuid.UUID) {
	tok, _, err := testTokenMaker.CreateToken(userID, employeeID, username, role, branchID, time.Minute)
	if err != nil {
		t.Fatalf("Lỗi tạo token: %v", err)
	}
	req.Header.Set(middleware.AuthorizationHeaderKey, fmt.Sprintf("%s %s", middleware.AuthorizationTypeBearer, tok))
}

func createTestUser(t *testing.T, username, password, role string) (db.User, db.Branch, db.Employee) {
	ctx := context.Background()

	// 1. Tạo branch
	branch, err := testStore.CreateBranch(ctx, db.CreateBranchParams{
		Name: "Chi nhánh Test User",
		Code: fmt.Sprintf("CN-U-%d", time.Now().UnixNano()),
	})
	if err != nil {
		t.Fatalf("CreateBranch thất bại: %v", err)
	}

	// 2. Tạo department
	dept, err := testStore.CreateDepartment(ctx, fmt.Sprintf("Phòng Ban %d", time.Now().UnixNano()%10000))
	if err != nil {
		t.Fatalf("CreateDepartment thất bại: %v", err)
	}

	// 3. Tạo employee
	emp, err := testStore.CreateEmployee(ctx, db.CreateEmployeeParams{
		BranchID:     branch.ID,
		DepartmentID: dept.ID,
		FullName:     "Nguyễn Văn Test",
		Email:        fmt.Sprintf("test%d@example.com", time.Now().UnixNano()),
	})
	if err != nil {
		t.Fatalf("CreateEmployee thất bại: %v", err)
	}

	// 4. Tạo user (user.ID != emp.ID)
	hashedPassword, err := util.HashPassword(password)
	if err != nil {
		t.Fatalf("HashPassword thất bại: %v", err)
	}

	user, err := testStore.CreateUser(ctx, db.CreateUserParams{
		EmployeeID:   emp.ID,
		Username:     username,
		PasswordHash: hashedPassword,
		Role:         role,
		IsActive:     pgtype.Bool{Bool: true, Valid: true},
	})
	if err != nil {
		t.Fatalf("CreateUser thất bại: %v", err)
	}

	return user, branch, emp
}

func TestHealthCheckAPI(t *testing.T) {
	rec := httptest.NewRecorder()
	req, _ := http.NewRequest(http.MethodGet, "/health", nil)
	testServer.Router().ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Errorf("Kỳ vọng 200 OK cho /health, nhận được: %d", rec.Code)
	}
}

func TestBranchAPI_AccessControl(t *testing.T) {
	userID := uuid.New()
	empID := uuid.New()
	branchID := uuid.New()

	// 1. Không có Token -> 401 Unauthorized
	req1, _ := http.NewRequest(http.MethodGet, "/api/v1/branches", nil)
	rec1 := httptest.NewRecorder()
	testServer.Router().ServeHTTP(rec1, req1)
	if rec1.Code != http.StatusUnauthorized {
		t.Errorf("Kỳ vọng 401 Unauthorized, nhận được: %d", rec1.Code)
	}

	// 2. Salesperson tạo branch -> 403 Forbidden
	branchPayload := map[string]interface{}{
		"name": "Chi Nhánh Test Không Hợp Lệ",
		"code": fmt.Sprintf("CN-RBAC-%d", time.Now().UnixNano()),
	}
	body, _ := json.Marshal(branchPayload)
	req2, _ := http.NewRequest(http.MethodPost, "/api/v1/branches", bytes.NewBuffer(body))
	req2.Header.Set("Content-Type", "application/json")
	addAuthHeader(t, req2, userID, empID, "sales_user", "salesperson", branchID)

	rec2 := httptest.NewRecorder()
	testServer.Router().ServeHTTP(rec2, req2)
	if rec2.Code != http.StatusForbidden {
		t.Errorf("Kỳ vọng 403 Forbidden khi salesperson tạo branch, nhận được: %d", rec2.Code)
	}

	// 3. Superadmin tạo branch -> 201 Created
	branchCode := fmt.Sprintf("CN-ADM-%d", time.Now().UnixNano()%1000000)
	superPayload := map[string]interface{}{
		"name":    "Chi Nhánh SuperAdmin Q1",
		"code":    branchCode,
		"address": "123 Lê Lợi, Q1",
		"phone":   "0987654321",
	}
	body3, _ := json.Marshal(superPayload)
	req3, _ := http.NewRequest(http.MethodPost, "/api/v1/branches", bytes.NewBuffer(body3))
	req3.Header.Set("Content-Type", "application/json")
	addAuthHeader(t, req3, userID, empID, "super_admin", "superadmin", branchID)

	rec3 := httptest.NewRecorder()
	testServer.Router().ServeHTTP(rec3, req3)
	if rec3.Code != http.StatusCreated {
		t.Errorf("Kỳ vọng 201 Created khi superadmin tạo branch, nhận được: %d (body: %s)", rec3.Code, rec3.Body.String())
	}

	// 4. Lấy danh sách Branches với token hợp lệ -> 200 OK
	req4, _ := http.NewRequest(http.MethodGet, "/api/v1/branches?page_id=1&page_size=10", nil)
	addAuthHeader(t, req4, userID, empID, "sales_user", "salesperson", branchID)

	rec4 := httptest.NewRecorder()
	testServer.Router().ServeHTTP(rec4, req4)
	if rec4.Code != http.StatusOK {
		t.Errorf("Kỳ vọng 200 OK khi lấy danh sách chi nhánh, nhận được: %d", rec4.Code)
	}
}

func TestAuth_Login_RenewToken_Logout_Flow(t *testing.T) {
	username := fmt.Sprintf("user%d", time.Now().UnixNano())
	password := "secretPassword123"
	user, _, _ := createTestUser(t, username, password, "salesperson")

	// 1. Đăng nhập (Login)
	loginPayload := map[string]string{
		"username": username,
		"password": password,
	}
	body, _ := json.Marshal(loginPayload)
	reqLogin, _ := http.NewRequest(http.MethodPost, "/api/v1/auth/login", bytes.NewBuffer(body))
	reqLogin.Header.Set("Content-Type", "application/json")
	recLogin := httptest.NewRecorder()
	testServer.Router().ServeHTTP(recLogin, reqLogin)

	if recLogin.Code != http.StatusOK {
		t.Fatalf("Đăng nhập thất bại, status %d, body: %s", recLogin.Code, recLogin.Body.String())
	}

	var loginResp struct {
		Success bool `json:"success"`
		Data    struct {
			SessionID    string `json:"session_id"`
			AccessToken  string `json:"access_token"`
			RefreshToken string `json:"refresh_token"`
		} `json:"data"`
	}
	if err := json.Unmarshal(recLogin.Body.Bytes(), &loginResp); err != nil {
		t.Fatalf("Không thể parse login response: %v", err)
	}

	if loginResp.Data.AccessToken == "" || loginResp.Data.RefreshToken == "" {
		t.Fatalf("AccessToken hoặc RefreshToken rỗng trong login response")
	}

	// 2. Gọi GetMe với Access Token
	reqMe, _ := http.NewRequest(http.MethodGet, "/api/v1/auth/me", nil)
	reqMe.Header.Set("Authorization", "Bearer "+loginResp.Data.AccessToken)
	recMe := httptest.NewRecorder()
	testServer.Router().ServeHTTP(recMe, reqMe)

	if recMe.Code != http.StatusOK {
		t.Fatalf("GetMe thất bại với access token mới, status %d", recMe.Code)
	}

	// 3. Cấp lại Token mới bằng Refresh Token (Renew Access Token)
	renewPayload := map[string]string{
		"refresh_token": loginResp.Data.RefreshToken,
	}
	renewBody, _ := json.Marshal(renewPayload)
	reqRenew, _ := http.NewRequest(http.MethodPost, "/api/v1/auth/renew", bytes.NewBuffer(renewBody))
	reqRenew.Header.Set("Content-Type", "application/json")
	recRenew := httptest.NewRecorder()
	testServer.Router().ServeHTTP(recRenew, reqRenew)

	if recRenew.Code != http.StatusOK {
		t.Fatalf("Renew Access Token thất bại, status %d, body: %s", recRenew.Code, recRenew.Body.String())
	}

	var renewResp struct {
		Success bool `json:"success"`
		Data    struct {
			AccessToken string `json:"access_token"`
		} `json:"data"`
	}
	_ = json.Unmarshal(recRenew.Body.Bytes(), &renewResp)

	if renewResp.Data.AccessToken == "" {
		t.Fatalf("New AccessToken rỗng sau khi renew")
	}

	// 4. Logout / Khóa Session
	logoutPayload := map[string]string{
		"session_id": loginResp.Data.SessionID,
	}
	logoutBody, _ := json.Marshal(logoutPayload)
	reqLogout, _ := http.NewRequest(http.MethodPost, "/api/v1/auth/logout", bytes.NewBuffer(logoutBody))
	reqLogout.Header.Set("Content-Type", "application/json")
	reqLogout.Header.Set("Authorization", "Bearer "+renewResp.Data.AccessToken)
	recLogout := httptest.NewRecorder()
	testServer.Router().ServeHTTP(recLogout, reqLogout)

	if recLogout.Code != http.StatusOK {
		t.Fatalf("Logout thất bại, status %d", recLogout.Code)
	}

	// 5. Thử Renew lại với Session đã bị khóa -> 403 Forbidden
	reqRenewBlocked, _ := http.NewRequest(http.MethodPost, "/api/v1/auth/renew", bytes.NewBuffer(renewBody))
	reqRenewBlocked.Header.Set("Content-Type", "application/json")
	recRenewBlocked := httptest.NewRecorder()
	testServer.Router().ServeHTTP(recRenewBlocked, reqRenewBlocked)

	if recRenewBlocked.Code != http.StatusForbidden {
		t.Errorf("Kỳ vọng 403 Forbidden khi renew token với session đã bị khóa, nhận được: %d", recRenewBlocked.Code)
	}

	_ = user
}
