package token

import (
	"testing"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
)

const testSecretKey = "12345678901234567890123456789012" // 32 chars

func TestJWTMaker(t *testing.T) {
	maker, err := NewJWTMaker(testSecretKey)
	if err != nil {
		t.Fatalf("Không thể tạo JWTMaker: %v", err)
	}

	userID := uuid.New()
	employeeID := uuid.New()
	branchID := uuid.New()
	username := "testuser"
	role := "superadmin"
	duration := time.Minute

	issuedAt := time.Now()
	expiredAt := issuedAt.Add(duration)

	token, payload, err := maker.CreateToken(userID, employeeID, username, role, branchID, duration)
	if err != nil {
		t.Fatalf("CreateToken thất bại: %v", err)
	}
	if len(token) == 0 {
		t.Errorf("Kỳ vọng token string không rỗng")
	}
	if payload == nil {
		t.Fatalf("Kỳ vọng payload không nil")
	}

	gotPayload, err := maker.VerifyToken(token)
	if err != nil {
		t.Fatalf("VerifyToken thất bại: %v", err)
	}

	if gotPayload.UserID != userID {
		t.Errorf("Kỳ vọng UserID %v, nhận được %v", userID, gotPayload.UserID)
	}
	if gotPayload.EmployeeID != employeeID {
		t.Errorf("Kỳ vọng EmployeeID %v, nhận được %v", employeeID, gotPayload.EmployeeID)
	}
	if gotPayload.Username != username {
		t.Errorf("Kỳ vọng Username %s, nhận được %s", username, gotPayload.Username)
	}
	if gotPayload.Role != role {
		t.Errorf("Kỳ vọng Role %s, nhận được %s", role, gotPayload.Role)
	}
	if gotPayload.BranchID != branchID {
		t.Errorf("Kỳ vọng BranchID %v, nhận được %v", branchID, gotPayload.BranchID)
	}
	if gotPayload.ExpiresAt.Time.Sub(expiredAt).Abs() > time.Second {
		t.Errorf("Thời gian hết hạn không chính xác")
	}
}

func TestExpiredJWTToken(t *testing.T) {
	maker, err := NewJWTMaker(testSecretKey)
	if err != nil {
		t.Fatalf("Không thể tạo JWTMaker: %v", err)
	}

	userID := uuid.New()
	employeeID := uuid.New()
	branchID := uuid.New()

	token, payload, err := maker.CreateToken(userID, employeeID, "testuser", "salesperson", branchID, -time.Minute)
	if err != nil {
		t.Fatalf("CreateToken thất bại: %v", err)
	}
	if payload == nil {
		t.Fatalf("Kỳ vọng payload không nil")
	}

	gotPayload, err := maker.VerifyToken(token)
	if err == nil {
		t.Fatalf("Kỳ vọng lỗi expired token, nhưng nhận được nil")
	}
	if gotPayload != nil {
		t.Errorf("Kỳ vọng payload nil khi token hết hạn")
	}
}

func TestInvalidJWTTokenAlgNone(t *testing.T) {
	payload, err := NewPayload(uuid.New(), uuid.New(), "hacker", "superadmin", uuid.New(), time.Minute)
	if err != nil {
		t.Fatalf("NewPayload thất bại: %v", err)
	}

	jwtToken := jwt.NewWithClaims(jwt.SigningMethodNone, payload)
	token, err := jwtToken.SignedString(jwt.UnsafeAllowNoneSignatureType)
	if err != nil {
		t.Fatalf("SignedString thất bại: %v", err)
	}

	maker, err := NewJWTMaker(testSecretKey)
	if err != nil {
		t.Fatalf("NewJWTMaker thất bại: %v", err)
	}

	gotPayload, err := maker.VerifyToken(token)
	if err == nil {
		t.Fatalf("Kỳ vọng lỗi khi token sử dụng thuật toán none")
	}
	if gotPayload != nil {
		t.Errorf("Kỳ vọng payload nil khi token không hợp lệ")
	}
}
