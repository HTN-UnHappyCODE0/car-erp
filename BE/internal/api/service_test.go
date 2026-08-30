package api

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"erp-backend/db/sqlc"
)

func TestService_OdometerGuard_And_BranchManagerOverride(t *testing.T) {
	superUser, branch, superEmp := createTestUser(t, fmt.Sprintf("super_srv_%d", time.Now().UnixNano()), "pass123456", "superadmin")
	advisorUser, _, advisorEmp := createTestUser(t, fmt.Sprintf("adv_srv_%d", time.Now().UnixNano()), "pass123456", "salesperson")
	managerUser, _, managerEmp := createTestUser(t, fmt.Sprintf("mgr_srv_%d", time.Now().UnixNano()), "pass123456", "branch_manager")

	// 1. Tạo Model xe & Nhập xe vào kho
	createModelPayload := map[string]interface{}{
		"make":  "Hyundai",
		"model": fmt.Sprintf("Tucson-Turbo-%d", time.Now().UnixNano()%10000),
		"year":  2026,
	}
	bodyModel, _ := json.Marshal(createModelPayload)
	reqModel, _ := http.NewRequest(http.MethodPost, "/api/v1/vehicle-models", bytes.NewBuffer(bodyModel))
	reqModel.Header.Set("Content-Type", "application/json")
	addAuthHeader(t, reqModel, superUser.ID, superEmp.ID, superUser.Username, "superadmin", branch.ID)
	recModel := httptest.NewRecorder()
	testServer.Router().ServeHTTP(recModel, reqModel)

	var modelResp struct {
		Data struct {
			ID string `json:"id"`
		} `json:"data"`
	}
	_ = json.Unmarshal(recModel.Body.Bytes(), &modelResp)

	vin := fmt.Sprintf("VIN%014d", time.Now().UnixNano()%100000000000000)
	branchIDStr := branch.ID.String()
	vehiclePayload := map[string]interface{}{
		"branch_id":      &branchIDStr,
		"model_id":       modelResp.Data.ID,
		"vin":            vin,
		"purchase_price": "850000000.00",
		"status":         "SOLD",
	}
	bodyVeh, _ := json.Marshal(vehiclePayload)
	reqVeh, _ := http.NewRequest(http.MethodPost, "/api/v1/vehicles", bytes.NewBuffer(bodyVeh))
	reqVeh.Header.Set("Content-Type", "application/json")
	addAuthHeader(t, reqVeh, superUser.ID, superEmp.ID, superUser.Username, "superadmin", branch.ID)
	recVeh := httptest.NewRecorder()
	testServer.Router().ServeHTTP(recVeh, reqVeh)

	var vehResp struct {
		Data struct {
			ID string `json:"id"`
		} `json:"data"`
	}
	_ = json.Unmarshal(recVeh.Body.Bytes(), &vehResp)
	vehicleID := vehResp.Data.ID

	// 2. Tạo Khách hàng
	cust, _ := testStore.CreateCustomer(context.Background(), db.CreateCustomerParams{
		Name:  "Nguyễn Văn Dịch Vụ",
		Phone: fmt.Sprintf("093%07d", time.Now().UnixNano()%10000000),
	})

	// 3. LẦN 1: Tiếp nhận xe với ODO = 10,000 km -> Thành công
	order1Payload := map[string]interface{}{
		"customer_id": cust.ID.String(),
		"vehicle_id":  vehicleID,
		"odometer":    10000,
		"symptoms":    "Bảo dưỡng cấp 10.000 KM định kỳ",
	}
	bodyOrder1, _ := json.Marshal(order1Payload)
	reqOrder1, _ := http.NewRequest(http.MethodPost, "/api/v1/repair-orders", bytes.NewBuffer(bodyOrder1))
	reqOrder1.Header.Set("Content-Type", "application/json")
	addAuthHeader(t, reqOrder1, advisorUser.ID, advisorEmp.ID, advisorUser.Username, "salesperson", branch.ID)
	recOrder1 := httptest.NewRecorder()
	testServer.Router().ServeHTTP(recOrder1, reqOrder1)
	if recOrder1.Code != http.StatusCreated {
		t.Fatalf("Không thể tạo lệnh sửa chữa lần 1: %d, body: %s", recOrder1.Code, recOrder1.Body.String())
	}

	// 4. LẦN 2: Cố tình tiếp nhận ODO = 8,000 km (< 10,000 km) không có override -> Bị chặn 400 Bad Request
	order2Payload := map[string]interface{}{
		"customer_id": cust.ID.String(),
		"vehicle_id":  vehicleID,
		"odometer":    8000,
		"symptoms":    "Xe bị giật khi tăng tốc",
	}
	bodyOrder2, _ := json.Marshal(order2Payload)
	reqOrder2, _ := http.NewRequest(http.MethodPost, "/api/v1/repair-orders", bytes.NewBuffer(bodyOrder2))
	reqOrder2.Header.Set("Content-Type", "application/json")
	addAuthHeader(t, reqOrder2, advisorUser.ID, advisorEmp.ID, advisorUser.Username, "salesperson", branch.ID)
	recOrder2 := httptest.NewRecorder()
	testServer.Router().ServeHTTP(recOrder2, reqOrder2)
	if recOrder2.Code != http.StatusBadRequest {
		t.Fatalf("Kỳ vọng 400 Bad Request khi ODO bị tua lùi, nhận được: %d", recOrder2.Code)
	}

	// 5. Cố tình override khi là Cố vấn dịch vụ (không có quyền) -> Bị chặn 400 Bad Request
	orderOverrideFailPayload := map[string]interface{}{
		"customer_id":       cust.ID.String(),
		"vehicle_id":        vehicleID,
		"odometer":          8000,
		"symptoms":          "Xe bị giật khi tăng tốc",
		"override_odometer": true,
		"override_reason":   "Cố vấn dịch vụ lần trước gõ nhầm 10.000",
	}
	bodyOverrideFail, _ := json.Marshal(orderOverrideFailPayload)
	reqOverrideFail, _ := http.NewRequest(http.MethodPost, "/api/v1/repair-orders", bytes.NewBuffer(bodyOverrideFail))
	reqOverrideFail.Header.Set("Content-Type", "application/json")
	addAuthHeader(t, reqOverrideFail, advisorUser.ID, advisorEmp.ID, advisorUser.Username, "salesperson", branch.ID)
	recOverrideFail := httptest.NewRecorder()
	testServer.Router().ServeHTTP(recOverrideFail, reqOverrideFail)
	if recOverrideFail.Code != http.StatusBadRequest {
		t.Fatalf("Kỳ vọng 400 Bad Request khi nhân viên thường cố tình override ODO, nhận được: %d", recOverrideFail.Code)
	}

	// 6. Quản lý chi nhánh (Branch Manager) phê duyệt override ODO với lý do giải trình hợp lệ -> 201 Created
	reqOverrideOK, _ := http.NewRequest(http.MethodPost, "/api/v1/repair-orders", bytes.NewBuffer(bodyOverrideFail))
	reqOverrideOK.Header.Set("Content-Type", "application/json")
	addAuthHeader(t, reqOverrideOK, managerUser.ID, managerEmp.ID, managerUser.Username, "branch_manager", branch.ID)
	recOverrideOK := httptest.NewRecorder()
	testServer.Router().ServeHTTP(recOverrideOK, reqOverrideOK)
	if recOverrideOK.Code != http.StatusCreated {
		t.Fatalf("Branch Manager override ODO thất bại: %d, body: %s", recOverrideOK.Code, recOverrideOK.Body.String())
	}
}

func TestService_Items_AtomicTotalCost_And_FinancePaymentFlow(t *testing.T) {
	superUser, branch, superEmp := createTestUser(t, fmt.Sprintf("super_srv2_%d", time.Now().UnixNano()), "pass123456", "superadmin")
	advisorUser, _, advisorEmp := createTestUser(t, fmt.Sprintf("adv_srv2_%d", time.Now().UnixNano()), "pass123456", "salesperson")

	// 1. Tạo Model & Xe
	createModelPayload := map[string]interface{}{
		"make":  "Toyota",
		"model": fmt.Sprintf("Camry-%d", time.Now().UnixNano()%10000),
		"year":  2026,
	}
	bodyModel, _ := json.Marshal(createModelPayload)
	reqModel, _ := http.NewRequest(http.MethodPost, "/api/v1/vehicle-models", bytes.NewBuffer(bodyModel))
	reqModel.Header.Set("Content-Type", "application/json")
	addAuthHeader(t, reqModel, superUser.ID, superEmp.ID, superUser.Username, "superadmin", branch.ID)
	recModel := httptest.NewRecorder()
	testServer.Router().ServeHTTP(recModel, reqModel)

	var modelResp struct {
		Data struct {
			ID string `json:"id"`
		} `json:"data"`
	}
	_ = json.Unmarshal(recModel.Body.Bytes(), &modelResp)

	vin := fmt.Sprintf("VIN%014d", time.Now().UnixNano()%100000000000000)
	branchIDStr := branch.ID.String()
	vehiclePayload := map[string]interface{}{
		"branch_id":      &branchIDStr,
		"model_id":       modelResp.Data.ID,
		"vin":            vin,
		"purchase_price": "1000000000.00",
		"status":         "SOLD",
	}
	bodyVeh, _ := json.Marshal(vehiclePayload)
	reqVeh, _ := http.NewRequest(http.MethodPost, "/api/v1/vehicles", bytes.NewBuffer(bodyVeh))
	reqVeh.Header.Set("Content-Type", "application/json")
	addAuthHeader(t, reqVeh, superUser.ID, superEmp.ID, superUser.Username, "superadmin", branch.ID)
	recVeh := httptest.NewRecorder()
	testServer.Router().ServeHTTP(recVeh, reqVeh)

	var vehResp struct {
		Data struct {
			ID string `json:"id"`
		} `json:"data"`
	}
	_ = json.Unmarshal(recVeh.Body.Bytes(), &vehResp)
	vehicleID := vehResp.Data.ID

	// 2. Tạo Khách hàng & Lệnh sửa chữa
	cust, _ := testStore.CreateCustomer(context.Background(), db.CreateCustomerParams{
		Name:  "Trần Văn Dịch Vụ 2",
		Phone: fmt.Sprintf("098%07d", time.Now().UnixNano()%10000000),
	})

	orderPayload := map[string]interface{}{
		"customer_id": cust.ID.String(),
		"vehicle_id":  vehicleID,
		"odometer":    25000,
		"symptoms":    "Bảo dưỡng thay dầu & kiểm tra phanh",
	}
	bodyOrder, _ := json.Marshal(orderPayload)
	reqOrder, _ := http.NewRequest(http.MethodPost, "/api/v1/repair-orders", bytes.NewBuffer(bodyOrder))
	reqOrder.Header.Set("Content-Type", "application/json")
	addAuthHeader(t, reqOrder, advisorUser.ID, advisorEmp.ID, advisorUser.Username, "salesperson", branch.ID)
	recOrder := httptest.NewRecorder()
	testServer.Router().ServeHTTP(recOrder, reqOrder)
	if recOrder.Code != http.StatusCreated {
		t.Fatalf("Không thể tạo lệnh sửa chữa: %d, body: %s", recOrder.Code, recOrder.Body.String())
	}

	var orderResp struct {
		Data struct {
			ID string `json:"id"`
		} `json:"data"`
	}
	_ = json.Unmarshal(recOrder.Body.Bytes(), &orderResp)
	orderID := orderResp.Data.ID

	// 3. THÊM VẬT TƯ (PART): Dầu động cơ Total 5L (1,200,000)
	partPayload := map[string]interface{}{
		"item_type":  "PART",
		"item_name":  "Dầu động cơ Total Quartz 9000 5W-30 (5L)",
		"quantity":   1,
		"unit_price": "1200000.00",
	}
	bodyPart, _ := json.Marshal(partPayload)
	reqPart, _ := http.NewRequest(http.MethodPost, "/api/v1/repair-orders/"+orderID+"/items", bytes.NewBuffer(bodyPart))
	reqPart.Header.Set("Content-Type", "application/json")
	addAuthHeader(t, reqPart, advisorUser.ID, advisorEmp.ID, advisorUser.Username, "salesperson", branch.ID)
	recPart := httptest.NewRecorder()
	testServer.Router().ServeHTTP(recPart, reqPart)
	if recPart.Code != http.StatusCreated {
		t.Fatalf("Thêm vật tư PART thất bại: %d, body: %s", recPart.Code, recPart.Body.String())
	}

	// 4. THÊM CÔNG THỢ (LABOR): Tiền công bảo dưỡng thay dầu (250,000)
	laborPayload := map[string]interface{}{
		"item_type":  "LABOR",
		"item_name":  "Tiền công bảo dưỡng & thay dầu động cơ",
		"quantity":   1,
		"unit_price": "250000.00",
	}
	bodyLabor, _ := json.Marshal(laborPayload)
	reqLabor, _ := http.NewRequest(http.MethodPost, "/api/v1/repair-orders/"+orderID+"/items", bytes.NewBuffer(bodyLabor))
	reqLabor.Header.Set("Content-Type", "application/json")
	addAuthHeader(t, reqLabor, advisorUser.ID, advisorEmp.ID, advisorUser.Username, "salesperson", branch.ID)
	recLabor := httptest.NewRecorder()
	testServer.Router().ServeHTTP(recLabor, reqLabor)
	if recLabor.Code != http.StatusCreated {
		t.Fatalf("Thêm công thợ LABOR thất bại: %d, body: %s", recLabor.Code, recLabor.Body.String())
	}

	// 5. Kiểm tra tính toán total_cost nguyên tử dưới DB -> Phải là 1,450,000
	reqGetOrder, _ := http.NewRequest(http.MethodGet, "/api/v1/repair-orders/"+orderID, nil)
	addAuthHeader(t, reqGetOrder, advisorUser.ID, advisorEmp.ID, advisorUser.Username, "salesperson", branch.ID)
	recGetOrder := httptest.NewRecorder()
	testServer.Router().ServeHTTP(recGetOrder, reqGetOrder)

	var getOrderResp struct {
		Data struct {
			TotalCost json.Number `json:"total_cost"`
			Status    string      `json:"status"`
		} `json:"data"`
	}
	_ = json.Unmarshal(recGetOrder.Body.Bytes(), &getOrderResp)
	if getOrderResp.Data.TotalCost.String() != "1450000.00" && getOrderResp.Data.TotalCost.String() != "1450000" {
		t.Fatalf("Kỳ vọng total_cost là 1450000.00, nhận được: %s", getOrderResp.Data.TotalCost.String())
	}

	// 6. CHUYỂN TRẠNG THÁI: OPEN -> IN_PROGRESS -> COMPLETED
	progressPayload := map[string]string{"status": "IN_PROGRESS"}
	bodyProgress, _ := json.Marshal(progressPayload)
	reqProgress, _ := http.NewRequest(http.MethodPatch, "/api/v1/repair-orders/"+orderID+"/status", bytes.NewBuffer(bodyProgress))
	reqProgress.Header.Set("Content-Type", "application/json")
	addAuthHeader(t, reqProgress, advisorUser.ID, advisorEmp.ID, advisorUser.Username, "salesperson", branch.ID)
	recProgress := httptest.NewRecorder()
	testServer.Router().ServeHTTP(recProgress, reqProgress)
	if recProgress.Code != http.StatusOK {
		t.Fatalf("Chuyển trạng thái sang IN_PROGRESS thất bại: %d", recProgress.Code)
	}

	completedPayload := map[string]string{
		"status":    "COMPLETED",
		"diagnosis": "Đã thay dầu động cơ mới và kiểm tra hệ thống phanh đạt chuẩn an toàn",
	}
	bodyCompleted, _ := json.Marshal(completedPayload)
	reqCompleted, _ := http.NewRequest(http.MethodPatch, "/api/v1/repair-orders/"+orderID+"/status", bytes.NewBuffer(bodyCompleted))
	reqCompleted.Header.Set("Content-Type", "application/json")
	addAuthHeader(t, reqCompleted, advisorUser.ID, advisorEmp.ID, advisorUser.Username, "salesperson", branch.ID)
	recCompleted := httptest.NewRecorder()
	testServer.Router().ServeHTTP(recCompleted, reqCompleted)
	if recCompleted.Code != http.StatusOK {
		t.Fatalf("Chuyển trạng thái sang COMPLETED thất bại: %d, body: %s", recCompleted.Code, recCompleted.Body.String())
	}

	// 7. KIỂM THỬ KHÓA VẬT TƯ: Cố tình thêm vật tư khi đã COMPLETED -> Phải bị chặn 400 Bad Request
	reqPartFail, _ := http.NewRequest(http.MethodPost, "/api/v1/repair-orders/"+orderID+"/items", bytes.NewBuffer(bodyPart))
	reqPartFail.Header.Set("Content-Type", "application/json")
	addAuthHeader(t, reqPartFail, advisorUser.ID, advisorEmp.ID, advisorUser.Username, "salesperson", branch.ID)
	recPartFail := httptest.NewRecorder()
	testServer.Router().ServeHTTP(recPartFail, reqPartFail)
	if recPartFail.Code != http.StatusBadRequest {
		t.Fatalf("Kỳ vọng 400 Bad Request khi sửa vật tư của lệnh đã COMPLETED, nhận được: %d", recPartFail.Code)
	}

	// 8. XUẤT HÓA ĐƠN DỊCH VỤ (INVOICING)
	reqInvoice, _ := http.NewRequest(http.MethodPost, "/api/v1/repair-orders/"+orderID+"/invoice", nil)
	addAuthHeader(t, reqInvoice, superUser.ID, superEmp.ID, superUser.Username, "accountant", branch.ID)
	recInvoice := httptest.NewRecorder()
	testServer.Router().ServeHTTP(recInvoice, reqInvoice)
	if recInvoice.Code != http.StatusCreated {
		t.Fatalf("Xuất hóa đơn dịch vụ thất bại: %d, body: %s", recInvoice.Code, recInvoice.Body.String())
	}

	var invoiceResp struct {
		Data struct {
			ID     string      `json:"id"`
			Amount json.Number `json:"amount"`
			Status string      `json:"status"`
		} `json:"data"`
	}
	_ = json.Unmarshal(recInvoice.Body.Bytes(), &invoiceResp)
	invoiceID := invoiceResp.Data.ID

	if invoiceResp.Data.Amount.String() != "1450000.00" && invoiceResp.Data.Amount.String() != "1450000" {
		t.Fatalf("Kỳ vọng số tiền hóa đơn là 1450000.00, nhận được: %s", invoiceResp.Data.Amount.String())
	}

	// 9. THU TIỀN QUA FINANCE API: Khách quẹt thẻ thanh toán 1,450,000 -> Hóa đơn chuyển sang PAID
	payPayload := map[string]interface{}{
		"payment_method": "BANK_TRANSFER",
		"amount":         "1450000.00",
		"reference_code": fmt.Sprintf("FT-SRV-%d", time.Now().UnixNano()),
		"note":           "Khách chuyển khoản thanh toán phí dịch vụ bảo dưỡng",
	}
	bodyPay, _ := json.Marshal(payPayload)
	reqPay, _ := http.NewRequest(http.MethodPost, "/api/v1/invoices/"+invoiceID+"/payments", bytes.NewBuffer(bodyPay))
	reqPay.Header.Set("Content-Type", "application/json")
	addAuthHeader(t, reqPay, superUser.ID, superEmp.ID, superUser.Username, "accountant", branch.ID)
	recPay := httptest.NewRecorder()
	testServer.Router().ServeHTTP(recPay, reqPay)
	if recPay.Code != http.StatusCreated {
		t.Fatalf("Thanh toán hóa đơn dịch vụ thất bại: %d, body: %s", recPay.Code, recPay.Body.String())
	}

	// 10. KIỂM TRA LỊCH SỬ BẢO DƯỠNG CỦA XE (AI SERVICE HISTORY)
	reqHistory, _ := http.NewRequest(http.MethodGet, "/api/v1/repair-orders/vehicle/"+vehicleID+"/history", nil)
	addAuthHeader(t, reqHistory, advisorUser.ID, advisorEmp.ID, advisorUser.Username, "salesperson", branch.ID)
	recHistory := httptest.NewRecorder()
	testServer.Router().ServeHTTP(recHistory, reqHistory)
	if recHistory.Code != http.StatusOK {
		t.Fatalf("Lấy lịch sử bảo dưỡng xe thất bại: %d", recHistory.Code)
	}

	var historyResp struct {
		Data []struct {
			ID       string `json:"id"`
			Odometer int32  `json:"odometer"`
			Status   string `json:"status"`
		} `json:"data"`
	}
	_ = json.Unmarshal(recHistory.Body.Bytes(), &historyResp)
	if len(historyResp.Data) == 0 {
		t.Fatalf("Kỳ vọng có ít nhất 1 bản ghi lịch sử bảo dưỡng xe")
	}
}
