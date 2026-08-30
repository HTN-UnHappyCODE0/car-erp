package api

import (
	"bytes"
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/google/uuid"
)

func TestVehicleModelsAPI(t *testing.T) {
	superadminID := uuid.New()
	empID := uuid.New()
	branchID := uuid.New()

	// 1. Superadmin tạo Dòng xe mới -> 201 Created
	createPayload := map[string]interface{}{
		"make":  "VinFast",
		"model": fmt.Sprintf("VF8-Plus-%d", time.Now().UnixNano()%100000),
		"year":  2026,
		"trim":  "Plus Cao Cấp",
		"specifications": map[string]interface{}{
			"battery_capacity": "87.7 kWh",
			"horsepower":       402,
			"drive_type":       "AWD",
		},
	}
	body, _ := json.Marshal(createPayload)
	req, _ := http.NewRequest(http.MethodPost, "/api/v1/vehicle-models", bytes.NewBuffer(body))
	req.Header.Set("Content-Type", "application/json")
	addAuthHeader(t, req, superadminID, empID, "super_admin", "superadmin", branchID)

	rec := httptest.NewRecorder()
	testServer.Router().ServeHTTP(rec, req)

	if rec.Code != http.StatusCreated {
		t.Fatalf("Kỳ vọng 201 Created khi tạo VehicleModel, nhận được: %d, body: %s", rec.Code, rec.Body.String())
	}

	var createResp struct {
		Success bool `json:"success"`
		Data    struct {
			ID    string `json:"id"`
			Make  string `json:"make"`
			Model string `json:"model"`
		} `json:"data"`
	}
	_ = json.Unmarshal(rec.Body.Bytes(), &createResp)
	modelID := createResp.Data.ID

	// 2. Salesperson lấy danh sách Dòng xe -> 200 OK
	salesID := uuid.New()
	salesEmpID := uuid.New()
	reqList, _ := http.NewRequest(http.MethodGet, "/api/v1/vehicle-models?page_id=1&page_size=10&make=VinFast", nil)
	addAuthHeader(t, reqList, salesID, salesEmpID, "sales_user", "salesperson", branchID)

	recList := httptest.NewRecorder()
	testServer.Router().ServeHTTP(recList, reqList)
	if recList.Code != http.StatusOK {
		t.Fatalf("Kỳ vọng 200 OK khi lấy danh sách dòng xe, nhận được: %d", recList.Code)
	}

	// 3. Xem chi tiết Model theo ID -> 200 OK
	reqGet, _ := http.NewRequest(http.MethodGet, "/api/v1/vehicle-models/"+modelID, nil)
	addAuthHeader(t, reqGet, salesID, salesEmpID, "sales_user", "salesperson", branchID)

	recGet := httptest.NewRecorder()
	testServer.Router().ServeHTTP(recGet, reqGet)
	if recGet.Code != http.StatusOK {
		t.Fatalf("Kỳ vọng 200 OK khi lấy chi tiết dòng xe, nhận được: %d", recGet.Code)
	}
}

func TestVehicles_ErrorHandling_And_Transfer(t *testing.T) {
	superadminID := uuid.New()
	superEmpID := uuid.New()

	// 1. Tạo 2 chi nhánh
	_, branchA, _ := createTestUser(t, fmt.Sprintf("mgrA_%d", time.Now().UnixNano()), "pass123456", "branch_manager")
	_, branchB, _ := createTestUser(t, fmt.Sprintf("mgrB_%d", time.Now().UnixNano()), "pass123456", "branch_manager")

	// 2. Tạo 1 Model xe
	createModelPayload := map[string]interface{}{
		"make":  "Hyundai",
		"model": fmt.Sprintf("Tucson-Turbo-%d", time.Now().UnixNano()%10000),
		"year":  2026,
	}
	bodyModel, _ := json.Marshal(createModelPayload)
	reqModel, _ := http.NewRequest(http.MethodPost, "/api/v1/vehicle-models", bytes.NewBuffer(bodyModel))
	reqModel.Header.Set("Content-Type", "application/json")
	addAuthHeader(t, reqModel, superadminID, superEmpID, "super_admin", "superadmin", branchA.ID)
	recModel := httptest.NewRecorder()
	testServer.Router().ServeHTTP(recModel, reqModel)

	var modelResp struct {
		Data struct {
			ID string `json:"id"`
		} `json:"data"`
	}
	_ = json.Unmarshal(recModel.Body.Bytes(), &modelResp)
	modelID := modelResp.Data.ID

	// 3. Nhập xe vào Branch A (VIN duy nhất 17 ký tự)
	vin := fmt.Sprintf("VIN%014d", time.Now().UnixNano()%100000000000000)
	branchAIDStr := branchA.ID.String()
	vehiclePayload := map[string]interface{}{
		"branch_id":      &branchAIDStr,
		"model_id":       modelID,
		"vin":            vin,
		"engine_number":  "ENG-12345",
		"color_exterior": "Trắng Ngọc Trai",
		"color_interior": "Đen Sang Trọng",
		"purchase_price": "950000000.00",
		"status":         "IN_STOCK",
	}
	bodyVeh, _ := json.Marshal(vehiclePayload)
	reqVeh, _ := http.NewRequest(http.MethodPost, "/api/v1/vehicles", bytes.NewBuffer(bodyVeh))
	reqVeh.Header.Set("Content-Type", "application/json")
	addAuthHeader(t, reqVeh, superadminID, superEmpID, "super_admin", "superadmin", branchA.ID)

	recVeh := httptest.NewRecorder()
	testServer.Router().ServeHTTP(recVeh, reqVeh)
	if recVeh.Code != http.StatusCreated {
		t.Fatalf("Kỳ vọng 201 Created khi nhập xe, nhận được: %d, body: %s", recVeh.Code, recVeh.Body.String())
	}

	var vehResp struct {
		Data struct {
			ID string `json:"id"`
		} `json:"data"`
	}
	_ = json.Unmarshal(recVeh.Body.Bytes(), &vehResp)
	vehicleID := vehResp.Data.ID

	// 4. KIỂM THỬ ERROR HANDLING: Cố tình nhập trùng số VIN -> Phải nhận 409 Conflict
	reqDup, _ := http.NewRequest(http.MethodPost, "/api/v1/vehicles", bytes.NewBuffer(bodyVeh))
	reqDup.Header.Set("Content-Type", "application/json")
	addAuthHeader(t, reqDup, superadminID, superEmpID, "super_admin", "superadmin", branchA.ID)

	recDup := httptest.NewRecorder()
	testServer.Router().ServeHTTP(recDup, reqDup)
	if recDup.Code != http.StatusConflict {
		t.Errorf("Kỳ vọng 409 Conflict khi trùng số VIN, nhận được: %d (body: %s)", recDup.Code, recDup.Body.String())
	}

	// 5. KIỂM THỬ ERROR HANDLING: Nhập xe với Model ID không tồn tại -> Phải nhận 400 Bad Request
	fakeModelPayload := map[string]interface{}{
		"model_id":       uuid.New().String(),
		"vin":            fmt.Sprintf("VIN%014d", (time.Now().UnixNano()+1)%100000000000000),
		"purchase_price": "950000000.00",
	}
	bodyFake, _ := json.Marshal(fakeModelPayload)
	reqFake, _ := http.NewRequest(http.MethodPost, "/api/v1/vehicles", bytes.NewBuffer(bodyFake))
	reqFake.Header.Set("Content-Type", "application/json")
	addAuthHeader(t, reqFake, superadminID, superEmpID, "super_admin", "superadmin", branchA.ID)

	recFake := httptest.NewRecorder()
	testServer.Router().ServeHTTP(recFake, reqFake)
	if recFake.Code != http.StatusBadRequest {
		t.Errorf("Kỳ vọng 400 Bad Request khi sai Foreign Key Model, nhận được: %d (body: %s)", recFake.Code, recFake.Body.String())
	}

	// 6. KIỂM THỬ CẬP NHẬT TRẠNG THÁI XE (PATCH /status) -> 200 OK
	statusPayload := map[string]string{
		"status": "RESERVED",
	}
	bodyStatus, _ := json.Marshal(statusPayload)
	reqStatus, _ := http.NewRequest(http.MethodPatch, "/api/v1/vehicles/"+vehicleID+"/status", bytes.NewBuffer(bodyStatus))
	reqStatus.Header.Set("Content-Type", "application/json")
	addAuthHeader(t, reqStatus, superadminID, superEmpID, "super_admin", "superadmin", branchA.ID)

	recStatus := httptest.NewRecorder()
	testServer.Router().ServeHTTP(recStatus, reqStatus)
	if recStatus.Code != http.StatusOK {
		t.Errorf("Kỳ vọng 200 OK khi cập nhật trạng thái xe, nhận được: %d", recStatus.Code)
	}

	// 7. KIỂM THỬ ĐIỀU CHUYỂN XE TỪ BRANCH A SANG BRANCH B
	// Chuyển lại status IN_STOCK trước khi transfer
	statusPayload["status"] = "IN_STOCK"
	bodyStock, _ := json.Marshal(statusPayload)
	reqStock, _ := http.NewRequest(http.MethodPatch, "/api/v1/vehicles/"+vehicleID+"/status", bytes.NewBuffer(bodyStock))
	reqStock.Header.Set("Content-Type", "application/json")
	addAuthHeader(t, reqStock, superadminID, superEmpID, "super_admin", "superadmin", branchA.ID)
	testServer.Router().ServeHTTP(httptest.NewRecorder(), reqStock)

	transferPayload := map[string]string{
		"to_branch_id": branchB.ID.String(),
	}
	bodyTransfer, _ := json.Marshal(transferPayload)
	reqTransfer, _ := http.NewRequest(http.MethodPost, "/api/v1/vehicles/"+vehicleID+"/transfer", bytes.NewBuffer(bodyTransfer))
	reqTransfer.Header.Set("Content-Type", "application/json")
	addAuthHeader(t, reqTransfer, superadminID, superEmpID, "super_admin", "superadmin", branchA.ID)

	recTransfer := httptest.NewRecorder()
	testServer.Router().ServeHTTP(recTransfer, reqTransfer)
	if recTransfer.Code != http.StatusOK {
		t.Fatalf("Kỳ vọng 200 OK khi điều chuyển xe, nhận được: %d (body: %s)", recTransfer.Code, recTransfer.Body.String())
	}
}
