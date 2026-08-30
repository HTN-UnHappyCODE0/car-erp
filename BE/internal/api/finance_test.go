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
	"erp-backend/internal/domain"
)

func TestInvoice_Creation_And_RLS(t *testing.T) {
	accUserA, branchA, accEmpA := createTestUser(t, fmt.Sprintf("accA_%d", time.Now().UnixNano()), "pass123456", "accountant")
	_, branchB, empB := createTestUser(t, fmt.Sprintf("accB_%d", time.Now().UnixNano()), "pass123456", "accountant")

	invNum := fmt.Sprintf("INV-%d", time.Now().UnixNano()%1000000)
	payload := map[string]interface{}{
		"invoice_number": invNum,
		"amount":         "50000000.00",
		"due_date":       "2026-09-30",
	}
	body, _ := json.Marshal(payload)
	req, _ := http.NewRequest(http.MethodPost, "/api/v1/invoices", bytes.NewBuffer(body))
	req.Header.Set("Content-Type", "application/json")
	addAuthHeader(t, req, accUserA.ID, accEmpA.ID, accUserA.Username, "accountant", branchA.ID)

	rec := httptest.NewRecorder()
	testServer.Router().ServeHTTP(rec, req)
	if rec.Code != http.StatusCreated {
		t.Fatalf("Không thể tạo hóa đơn: %d, body: %s", rec.Code, rec.Body.String())
	}

	var invResp struct {
		Data struct {
			ID string `json:"id"`
		} `json:"data"`
	}
	_ = json.Unmarshal(rec.Body.Bytes(), &invResp)
	invoiceID := invResp.Data.ID

	// 1. Kế toán Branch A truy vấn hóa đơn -> 200 OK
	reqGetA, _ := http.NewRequest(http.MethodGet, "/api/v1/invoices/"+invoiceID, nil)
	addAuthHeader(t, reqGetA, accUserA.ID, accEmpA.ID, accUserA.Username, "accountant", branchA.ID)
	recGetA := httptest.NewRecorder()
	testServer.Router().ServeHTTP(recGetA, reqGetA)
	if recGetA.Code != http.StatusOK {
		t.Fatalf("Branch A không xem được hóa đơn của mình: %d", recGetA.Code)
	}

	// 2. Kế toán Branch B truy vấn hóa đơn của Branch A -> Phải bị RLS chặn (404 Not Found)
	reqGetB, _ := http.NewRequest(http.MethodGet, "/api/v1/invoices/"+invoiceID, nil)
	addAuthHeader(t, reqGetB, empB.ID, empB.ID, "accB", "accountant", branchB.ID)
	recGetB := httptest.NewRecorder()
	testServer.Router().ServeHTTP(recGetB, reqGetB)
	if recGetB.Code != http.StatusNotFound {
		t.Fatalf("LỖI RLS: Branch B lại đọc được hóa đơn của Branch A! Status: %d", recGetB.Code)
	}
}

func TestFinance_AutomatedStateMachine_And_DeliveryGuard(t *testing.T) {
	superUser, branch, superEmp := createTestUser(t, fmt.Sprintf("super_fin_%d", time.Now().UnixNano()), "pass123456", "superadmin")
	salesUser, _, salesEmp := createTestUser(t, fmt.Sprintf("sales_fin_%d", time.Now().UnixNano()), "pass123456", "salesperson")

	// 1. Tạo Model xe & Nhập xe vào kho
	createModelPayload := map[string]interface{}{
		"make":  "VinFast",
		"model": fmt.Sprintf("VF8-Eco-%d", time.Now().UnixNano()%10000),
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
		"purchase_price": "900000000.00",
		"status":         "IN_STOCK",
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
		Name:  "Hoàng Đình Tài",
		Phone: fmt.Sprintf("094%07d", time.Now().UnixNano()%10000000),
	})

	// 3. Lên đơn hàng bán xe: Tổng 1.1 Tỷ, Cọc 50 Triệu (Status ban đầu: DRAFT)
	orderPayload := map[string]interface{}{
		"customer_id":    cust.ID.String(),
		"vehicle_id":     vehicleID,
		"total_amount":   "1100000000.00",
		"deposit_amount": "50000000.00",
	}
	bodyOrder, _ := json.Marshal(orderPayload)
	reqOrder, _ := http.NewRequest(http.MethodPost, "/api/v1/sales-orders", bytes.NewBuffer(bodyOrder))
	reqOrder.Header.Set("Content-Type", "application/json")
	addAuthHeader(t, reqOrder, salesUser.ID, salesEmp.ID, salesUser.Username, "salesperson", branch.ID)
	recOrder := httptest.NewRecorder()
	testServer.Router().ServeHTTP(recOrder, reqOrder)
	if recOrder.Code != http.StatusCreated {
		t.Fatalf("Không thể tạo đơn hàng: %d, body: %s", recOrder.Code, recOrder.Body.String())
	}

	var orderResp struct {
		Data struct {
			ID     string `json:"id"`
			Status string `json:"status"`
		} `json:"data"`
	}
	_ = json.Unmarshal(recOrder.Body.Bytes(), &orderResp)
	orderID := orderResp.Data.ID

	// 4. Kế toán xuất Hóa đơn đặt cọc (50 Triệu)
	orderIDStr := orderID
	invDepositPayload := map[string]interface{}{
		"order_id":       &orderIDStr,
		"invoice_number": fmt.Sprintf("INV-DEP-%d", time.Now().UnixNano()%1000000),
		"amount":         "50000000.00",
		"due_date":       "2026-09-05",
	}
	bodyInvDep, _ := json.Marshal(invDepositPayload)
	reqInvDep, _ := http.NewRequest(http.MethodPost, "/api/v1/invoices", bytes.NewBuffer(bodyInvDep))
	reqInvDep.Header.Set("Content-Type", "application/json")
	addAuthHeader(t, reqInvDep, superUser.ID, superEmp.ID, superUser.Username, "accountant", branch.ID)
	recInvDep := httptest.NewRecorder()
	testServer.Router().ServeHTTP(recInvDep, reqInvDep)
	if recInvDep.Code != http.StatusCreated {
		t.Fatalf("Không thể tạo hóa đơn cọc: %d, body: %s", recInvDep.Code, recInvDep.Body.String())
	}

	var invDepResp struct {
		Data struct {
			ID string `json:"id"`
		} `json:"data"`
	}
	_ = json.Unmarshal(recInvDep.Body.Bytes(), &invDepResp)
	invDepID := invDepResp.Data.ID

	// 5. THU TIỀN CỌC ĐỢT 1 (Part 1 - 20 Triệu) VỚI REFERENCE CODE (IDEMPOTENCY)
	refCodePart1 := fmt.Sprintf("FT-DEP-P1-%d", time.Now().UnixNano())
	payPart1Payload := map[string]interface{}{
		"payment_method": "BANK_TRANSFER",
		"amount":         "20000000.00",
		"reference_code": refCodePart1,
		"note":           "Khách chuyển cọc đợt 1",
	}
	bodyPayPart1, _ := json.Marshal(payPart1Payload)
	reqPayPart1, _ := http.NewRequest(http.MethodPost, "/api/v1/invoices/"+invDepID+"/payments", bytes.NewBuffer(bodyPayPart1))
	reqPayPart1.Header.Set("Content-Type", "application/json")
	addAuthHeader(t, reqPayPart1, superUser.ID, superEmp.ID, superUser.Username, "accountant", branch.ID)
	recPayPart1 := httptest.NewRecorder()
	testServer.Router().ServeHTTP(recPayPart1, reqPayPart1)
	if recPayPart1.Code != http.StatusCreated {
		t.Fatalf("Thu tiền cọc đợt 1 thất bại: %d, body: %s", recPayPart1.Code, recPayPart1.Body.String())
	}

	// 5.1 KIỂM THỬ IDEMPOTENCY: Cố tình gửi lại đúng reference_code vừa rồi -> Phải bị chặn 409 Conflict
	reqPayPart1Dup, _ := http.NewRequest(http.MethodPost, "/api/v1/invoices/"+invDepID+"/payments", bytes.NewBuffer(bodyPayPart1))
	reqPayPart1Dup.Header.Set("Content-Type", "application/json")
	addAuthHeader(t, reqPayPart1Dup, superUser.ID, superEmp.ID, superUser.Username, "accountant", branch.ID)
	recPayPart1Dup := httptest.NewRecorder()
	testServer.Router().ServeHTTP(recPayPart1Dup, reqPayPart1Dup)
	if recPayPart1Dup.Code != http.StatusConflict {
		t.Errorf("Kỳ vọng 409 Conflict khi gửi trùng reference_code, nhận được: %d (body: %s)", recPayPart1Dup.Code, recPayPart1Dup.Body.String())
	}

	// 5.2 THU NỐT 30 TRIỆU CỌC (ĐỦ 50 TRIỆU CỌC)
	refCodePart2 := fmt.Sprintf("FT-DEP-P2-%d", time.Now().UnixNano())
	payPart2Payload := map[string]interface{}{
		"payment_method": "BANK_TRANSFER",
		"amount":         "30000000.00",
		"reference_code": refCodePart2,
		"note":           "Khách chuyển nốt tiền cọc đợt 2",
	}
	bodyPayPart2, _ := json.Marshal(payPart2Payload)
	reqPayPart2, _ := http.NewRequest(http.MethodPost, "/api/v1/invoices/"+invDepID+"/payments", bytes.NewBuffer(bodyPayPart2))
	reqPayPart2.Header.Set("Content-Type", "application/json")
	addAuthHeader(t, reqPayPart2, superUser.ID, superEmp.ID, superUser.Username, "accountant", branch.ID)
	recPayPart2 := httptest.NewRecorder()
	testServer.Router().ServeHTTP(recPayPart2, reqPayPart2)
	if recPayPart2.Code != http.StatusCreated {
		t.Fatalf("Thu nốt cọc thất bại: %d, body: %s", recPayPart2.Code, recPayPart2.Body.String())
	}

	// Kiểm tra trạng thái đơn hàng -> Phải tự động là DEPOSIT_PAID
	reqGetOrder, _ := http.NewRequest(http.MethodGet, "/api/v1/sales-orders/"+orderID, nil)
	addAuthHeader(t, reqGetOrder, salesUser.ID, salesEmp.ID, salesUser.Username, "salesperson", branch.ID)
	recGetOrder := httptest.NewRecorder()
	testServer.Router().ServeHTTP(recGetOrder, reqGetOrder)

	var checkOrderResp struct {
		Data struct {
			Status string `json:"status"`
		} `json:"data"`
	}
	_ = json.Unmarshal(recGetOrder.Body.Bytes(), &checkOrderResp)
	if checkOrderResp.Data.Status != domain.OrderStatusDepositPaid {
		t.Fatalf("Kỳ vọng đơn hàng tự động nhảy sang DEPOSIT_PAID sau khi thu đủ cọc, nhưng hiện tại: %s", checkOrderResp.Data.Status)
	}

	// 6. KIỂM THỬ DELIVERY GUARD: Cố tình giao xe (DELIVERED) khi chưa thanh toán 100% -> Phải bị từ chối 400 Bad Request
	deliverPayload := map[string]string{
		"status": "DELIVERED",
	}
	bodyDeliver, _ := json.Marshal(deliverPayload)
	reqInvalidDeliver, _ := http.NewRequest(http.MethodPatch, "/api/v1/sales-orders/"+orderID+"/status", bytes.NewBuffer(bodyDeliver))
	reqInvalidDeliver.Header.Set("Content-Type", "application/json")
	addAuthHeader(t, reqInvalidDeliver, salesUser.ID, salesEmp.ID, salesUser.Username, "salesperson", branch.ID)
	recInvalidDeliver := httptest.NewRecorder()
	testServer.Router().ServeHTTP(recInvalidDeliver, reqInvalidDeliver)
	if recInvalidDeliver.Code != http.StatusBadRequest {
		t.Fatalf("Kỳ vọng 400 Bad Request khi cố tình giao xe chưa thanh toán đủ, nhận được: %d", recInvalidDeliver.Code)
	}

	// 7. Kế toán xuất Hóa đơn đợt 2 (1.05 Tỷ còn lại)
	invFinalPayload := map[string]interface{}{
		"order_id":       &orderIDStr,
		"invoice_number": fmt.Sprintf("INV-FIN-%d", time.Now().UnixNano()%1000000),
		"amount":         "1050000000.00",
		"due_date":       "2026-09-15",
	}
	bodyInvFinal, _ := json.Marshal(invFinalPayload)
	reqInvFinal, _ := http.NewRequest(http.MethodPost, "/api/v1/invoices", bytes.NewBuffer(bodyInvFinal))
	reqInvFinal.Header.Set("Content-Type", "application/json")
	addAuthHeader(t, reqInvFinal, superUser.ID, superEmp.ID, superUser.Username, "accountant", branch.ID)
	recInvFinal := httptest.NewRecorder()
	testServer.Router().ServeHTTP(recInvFinal, reqInvFinal)

	var invFinalResp struct {
		Data struct {
			ID string `json:"id"`
		} `json:"data"`
	}
	_ = json.Unmarshal(recInvFinal.Body.Bytes(), &invFinalResp)
	invFinalID := invFinalResp.Data.ID

	// 8. THU TIỀN ĐỢT 2: Khách đóng 1.05 Tỷ -> Đơn hàng TỰ ĐỘNG NHẢY SANG FULL_PAID
	refCodeFinal := fmt.Sprintf("FT-FIN-%d", time.Now().UnixNano())
	payFinalPayload := map[string]interface{}{
		"payment_method": "BANK_TRANSFER",
		"amount":         "1050000000.00",
		"reference_code": refCodeFinal,
		"note":           "Ngân hàng giải ngân thanh toán đợt cuối",
	}
	bodyPayFinal, _ := json.Marshal(payFinalPayload)
	reqPayFinal, _ := http.NewRequest(http.MethodPost, "/api/v1/invoices/"+invFinalID+"/payments", bytes.NewBuffer(bodyPayFinal))
	reqPayFinal.Header.Set("Content-Type", "application/json")
	addAuthHeader(t, reqPayFinal, superUser.ID, superEmp.ID, superUser.Username, "accountant", branch.ID)
	recPayFinal := httptest.NewRecorder()
	testServer.Router().ServeHTTP(recPayFinal, reqPayFinal)

	// Kiểm tra trạng thái đơn hàng -> Phải tự động là FULL_PAID
	reqGetOrder2, _ := http.NewRequest(http.MethodGet, "/api/v1/sales-orders/"+orderID, nil)
	addAuthHeader(t, reqGetOrder2, salesUser.ID, salesEmp.ID, salesUser.Username, "salesperson", branch.ID)
	recGetOrder2 := httptest.NewRecorder()
	testServer.Router().ServeHTTP(recGetOrder2, reqGetOrder2)
	_ = json.Unmarshal(recGetOrder2.Body.Bytes(), &checkOrderResp)
	if checkOrderResp.Data.Status != domain.OrderStatusFullPaid {
		t.Fatalf("Kỳ vọng đơn hàng tự động nhảy sang FULL_PAID sau khi thanh toán 100%%, nhận được: %s", checkOrderResp.Data.Status)
	}

	// 9. BÀN GIAO XE HỢP LỆ: Khi đơn đã FULL_PAID -> Chuyển sang DELIVERED thành công & Xe chuyển sang SOLD
	reqValidDeliver, _ := http.NewRequest(http.MethodPatch, "/api/v1/sales-orders/"+orderID+"/status", bytes.NewBuffer(bodyDeliver))
	reqValidDeliver.Header.Set("Content-Type", "application/json")
	addAuthHeader(t, reqValidDeliver, salesUser.ID, salesEmp.ID, salesUser.Username, "salesperson", branch.ID)
	recValidDeliver := httptest.NewRecorder()
	testServer.Router().ServeHTTP(recValidDeliver, reqValidDeliver)
	if recValidDeliver.Code != http.StatusOK {
		t.Fatalf("Giao xe thất bại khi đơn đã FULL_PAID: %d, body: %s", recValidDeliver.Code, recValidDeliver.Body.String())
	}

	// Kiểm tra trạng thái xe trong kho -> Phải là SOLD
	reqGetVeh, _ := http.NewRequest(http.MethodGet, "/api/v1/vehicles/"+vehicleID, nil)
	addAuthHeader(t, reqGetVeh, salesUser.ID, salesEmp.ID, salesUser.Username, "salesperson", branch.ID)
	recGetVeh := httptest.NewRecorder()
	testServer.Router().ServeHTTP(recGetVeh, reqGetVeh)

	var getVehResp struct {
		Data struct {
			Status string `json:"status"`
		} `json:"data"`
	}
	_ = json.Unmarshal(recGetVeh.Body.Bytes(), &getVehResp)
	if getVehResp.Data.Status != domain.VehicleStatusSold {
		t.Fatalf("Kỳ vọng xe chuyển sang SOLD sau khi giao xe, nhận được: %s", getVehResp.Data.Status)
	}
}
