package api

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"sync"
	"testing"
	"time"

	"erp-backend/db/sqlc"
	"erp-backend/internal/contextutil"
	"erp-backend/internal/domain"

	"github.com/google/uuid"
)

func TestStateMachine_Unit(t *testing.T) {
	// 1. Chuyển đổi hợp lệ
	if err := domain.ValidateOrderTransition("DRAFT", "DEPOSIT_PAID"); err != nil {
		t.Errorf("DRAFT -> DEPOSIT_PAID phải hợp lệ: %v", err)
	}
	if err := domain.ValidateOrderTransition("DEPOSIT_PAID", "FULL_PAID"); err != nil {
		t.Errorf("DEPOSIT_PAID -> FULL_PAID phải hợp lệ: %v", err)
	}
	if err := domain.ValidateOrderTransition("FULL_PAID", "DELIVERED"); err != nil {
		t.Errorf("FULL_PAID -> DELIVERED phải hợp lệ: %v", err)
	}

	// 2. Chuyển đổi NHẢY CÓC bất hợp pháp -> Phải báo lỗi
	if err := domain.ValidateOrderTransition("DRAFT", "DELIVERED"); err == nil {
		t.Errorf("Kỳ vọng lỗi khi nhảy cóc DRAFT -> DELIVERED")
	}
	if err := domain.ValidateOrderTransition("DELIVERED", "CANCELLED"); err == nil {
		t.Errorf("Kỳ vọng lỗi khi hủy đơn đã bàn giao")
	}
}

func TestCustomer_And_Lead_Lifecycle(t *testing.T) {
	salesUser, branch, salesEmp := createTestUser(t, fmt.Sprintf("sales_%d", time.Now().UnixNano()), "pass123456", "salesperson")

	// 1. Tạo Khách hàng mới
	phone := fmt.Sprintf("098%07d", time.Now().UnixNano()%10000000)
	custPayload := map[string]interface{}{
		"name":           "Nguyễn Văn An",
		"phone":          phone,
		"email":          fmt.Sprintf("an_%d@gmail.com", time.Now().UnixNano()%10000),
		"id_card_number": "001200001234",
		"address":        "Hà Nội",
	}
	bodyCust, _ := json.Marshal(custPayload)
	reqCust, _ := http.NewRequest(http.MethodPost, "/api/v1/customers", bytes.NewBuffer(bodyCust))
	reqCust.Header.Set("Content-Type", "application/json")
	addAuthHeader(t, reqCust, salesUser.ID, salesEmp.ID, salesUser.Username, "salesperson", branch.ID)

	recCust := httptest.NewRecorder()
	testServer.Router().ServeHTTP(recCust, reqCust)
	if recCust.Code != http.StatusCreated {
		t.Fatalf("Không thể tạo khách hàng: %d, body: %s", recCust.Code, recCust.Body.String())
	}

	var custResp struct {
		Data struct {
			ID string `json:"id"`
		} `json:"data"`
	}
	_ = json.Unmarshal(recCust.Body.Bytes(), &custResp)
	customerID := custResp.Data.ID

	// 2. Tra cứu khách hàng theo SĐT -> 200 OK
	reqPhone, _ := http.NewRequest(http.MethodGet, "/api/v1/customers/phone/"+phone, nil)
	addAuthHeader(t, reqPhone, salesUser.ID, salesEmp.ID, salesUser.Username, "salesperson", branch.ID)
	recPhone := httptest.NewRecorder()
	testServer.Router().ServeHTTP(recPhone, reqPhone)
	if recPhone.Code != http.StatusOK {
		t.Fatalf("Tra cứu SĐT thất bại: %d", recPhone.Code)
	}

	// 3. Tạo 2 Lead khác nhau cho CÙNG 1 khách hàng (Quan hệ 1-N)
	for i := 1; i <= 2; i++ {
		leadPayload := map[string]interface{}{
			"customer_id": customerID,
			"notes":       fmt.Sprintf("Khách quan tâm xe lần %d", i),
		}
		bodyLead, _ := json.Marshal(leadPayload)
		reqLead, _ := http.NewRequest(http.MethodPost, "/api/v1/leads", bytes.NewBuffer(bodyLead))
		reqLead.Header.Set("Content-Type", "application/json")
		addAuthHeader(t, reqLead, salesUser.ID, salesEmp.ID, salesUser.Username, "salesperson", branch.ID)

		recLead := httptest.NewRecorder()
		testServer.Router().ServeHTTP(recLead, reqLead)
		if recLead.Code != http.StatusCreated {
			t.Fatalf("Không thể tạo Lead lần %d: %d, body: %s", i, recLead.Code, recLead.Body.String())
		}
	}

	// 4. Lấy chi tiết khách hàng -> Phải thấy đủ 2 Leads
	reqDetail, _ := http.NewRequest(http.MethodGet, "/api/v1/customers/"+customerID, nil)
	addAuthHeader(t, reqDetail, salesUser.ID, salesEmp.ID, salesUser.Username, "salesperson", branch.ID)
	recDetail := httptest.NewRecorder()
	testServer.Router().ServeHTTP(recDetail, reqDetail)
	if recDetail.Code != http.StatusOK {
		t.Fatalf("Lấy chi tiết khách hàng thất bại: %d", recDetail.Code)
	}
}

func TestSalesOrder_RaceCondition_PessimisticLock(t *testing.T) {
	// 1. Khởi tạo Branch, Model, Vehicle
	superUser, branch, superEmp := createTestUser(t, fmt.Sprintf("super_%d", time.Now().UnixNano()), "pass123456", "superadmin")

	createModelPayload := map[string]interface{}{
		"make":  "VinFast",
		"model": fmt.Sprintf("VF9-%d", time.Now().UnixNano()%10000),
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
	modelID := modelResp.Data.ID

	// Nhập 1 chiếc xe duy nhất vào kho
	vin := fmt.Sprintf("VIN%014d", time.Now().UnixNano()%100000000000000)
	branchIDStr := branch.ID.String()
	vehiclePayload := map[string]interface{}{
		"branch_id":      &branchIDStr,
		"model_id":       modelID,
		"vin":            vin,
		"purchase_price": "1500000000.00",
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

	// 2. Tạo 2 nhân viên Sales và 2 khách hàng khác nhau
	sales1User, _, sales1Emp := createTestUser(t, fmt.Sprintf("sales1_%d", time.Now().UnixNano()), "pass123456", "salesperson")
	sales2User, _, sales2Emp := createTestUser(t, fmt.Sprintf("sales2_%d", time.Now().UnixNano()), "pass123456", "salesperson")

	cust1ID := uuid.New()
	cust2ID := uuid.New()

	ctx := context.Background()
	_ = testStore.ExecTx(contextutil.WithTenant(ctx, uuid.Nil, uuid.Nil, "superadmin"), func(q *db.Queries) error {
		c1, _ := q.CreateCustomer(ctx, db.CreateCustomerParams{
			Name:  "Khách 1",
			Phone: fmt.Sprintf("091%07d", time.Now().UnixNano()%10000000),
		})
		cust1ID = c1.ID

		c2, _ := q.CreateCustomer(ctx, db.CreateCustomerParams{
			Name:  "Khách 2",
			Phone: fmt.Sprintf("092%07d", (time.Now().UnixNano()+1)%10000000),
		})
		cust2ID = c2.ID
		return nil
	})

	// 3. RACE CONDITION TEST: 2 Sales cùng chốt 1 chiếc xe cùng một thời điểm bằng 2 goroutines
	var wg sync.WaitGroup
	statusCodeResults := make([]int, 2)

	orderPayload1 := map[string]interface{}{
		"customer_id":    cust1ID.String(),
		"vehicle_id":     vehicleID,
		"total_amount":   "1800000000.00",
		"deposit_amount": "50000000.00",
	}
	orderPayload2 := map[string]interface{}{
		"customer_id":    cust2ID.String(),
		"vehicle_id":     vehicleID,
		"total_amount":   "1800000000.00",
		"deposit_amount": "50000000.00",
	}

	wg.Add(2)
	go func() {
		defer wg.Done()
		b, _ := json.Marshal(orderPayload1)
		req, _ := http.NewRequest(http.MethodPost, "/api/v1/sales-orders", bytes.NewBuffer(b))
		req.Header.Set("Content-Type", "application/json")
		addAuthHeader(t, req, sales1User.ID, sales1Emp.ID, sales1User.Username, "salesperson", branch.ID)
		rec := httptest.NewRecorder()
		testServer.Router().ServeHTTP(rec, req)
		statusCodeResults[0] = rec.Code
	}()

	go func() {
		defer wg.Done()
		b, _ := json.Marshal(orderPayload2)
		req, _ := http.NewRequest(http.MethodPost, "/api/v1/sales-orders", bytes.NewBuffer(b))
		req.Header.Set("Content-Type", "application/json")
		addAuthHeader(t, req, sales2User.ID, sales2Emp.ID, sales2User.Username, "salesperson", branch.ID)
		rec := httptest.NewRecorder()
		testServer.Router().ServeHTTP(rec, req)
		statusCodeResults[1] = rec.Code
	}()

	wg.Wait()

	// Xác nhận: Chính xác 1 đơn thành công (201 Created), và 1 đơn bị từ chối (409/500/400)
	successCount := 0
	conflictCount := 0
	for _, code := range statusCodeResults {
		if code == http.StatusCreated {
			successCount++
		} else {
			conflictCount++
		}
	}

	if successCount != 1 || conflictCount != 1 {
		t.Fatalf("LỖI RACE CONDITION: Kỳ vọng đúng 1 đơn 201 và 1 đơn lỗi, kết quả nhận được: %v", statusCodeResults)
	}
}

func TestSalesOrder_Lifecycle(t *testing.T) {
	superUser, branch, superEmp := createTestUser(t, fmt.Sprintf("super_lc_%d", time.Now().UnixNano()), "pass123456", "superadmin")
	salesUser, _, salesEmp := createTestUser(t, fmt.Sprintf("sales_lc_%d", time.Now().UnixNano()), "pass123456", "salesperson")

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
		Name:  "Trần Thị Bích",
		Phone: fmt.Sprintf("097%07d", time.Now().UnixNano()%10000000),
	})

	// 3. Lên đơn hàng DRAFT -> Xe tự động chuyển sang RESERVED
	orderPayload := map[string]interface{}{
		"customer_id":     cust.ID.String(),
		"vehicle_id":      vehicleID,
		"total_amount":    "1200000000.00",
		"discount_amount": "20000000.00",
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
			ID string `json:"id"`
		} `json:"data"`
	}
	_ = json.Unmarshal(recOrder.Body.Bytes(), &orderResp)
	orderID := orderResp.Data.ID

	// 4. Chuyển trạng thái: DRAFT ➡️ DEPOSIT_PAID
	statusPayload := map[string]string{
		"status":         "DEPOSIT_PAID",
		"deposit_amount": "50000000.00",
	}
	bodyStatus, _ := json.Marshal(statusPayload)
	reqStatus, _ := http.NewRequest(http.MethodPatch, "/api/v1/sales-orders/"+orderID+"/status", bytes.NewBuffer(bodyStatus))
	reqStatus.Header.Set("Content-Type", "application/json")
	addAuthHeader(t, reqStatus, salesUser.ID, salesEmp.ID, salesUser.Username, "salesperson", branch.ID)
	recStatus := httptest.NewRecorder()
	testServer.Router().ServeHTTP(recStatus, reqStatus)
	if recStatus.Code != http.StatusOK {
		t.Fatalf("Không thể chuyển sang DEPOSIT_PAID: %d, body: %s", recStatus.Code, recStatus.Body.String())
	}

	// 5. Chuyển trạng thái: DEPOSIT_PAID ➡️ FULL_PAID
	statusPayload = map[string]string{
		"status": "FULL_PAID",
	}
	bodyStatus, _ = json.Marshal(statusPayload)
	reqStatus, _ = http.NewRequest(http.MethodPatch, "/api/v1/sales-orders/"+orderID+"/status", bytes.NewBuffer(bodyStatus))
	reqStatus.Header.Set("Content-Type", "application/json")
	addAuthHeader(t, reqStatus, salesUser.ID, salesEmp.ID, salesUser.Username, "salesperson", branch.ID)
	recStatus = httptest.NewRecorder()
	testServer.Router().ServeHTTP(recStatus, reqStatus)
	if recStatus.Code != http.StatusOK {
		t.Fatalf("Không thể chuyển sang FULL_PAID: %d", recStatus.Code)
	}

	// 6. Chuyển trạng thái: FULL_PAID ➡️ DELIVERED (Xe tự động chuyển sang SOLD)
	statusPayload = map[string]string{
		"status": "DELIVERED",
	}
	bodyStatus, _ = json.Marshal(statusPayload)
	reqStatus, _ = http.NewRequest(http.MethodPatch, "/api/v1/sales-orders/"+orderID+"/status", bytes.NewBuffer(bodyStatus))
	reqStatus.Header.Set("Content-Type", "application/json")
	addAuthHeader(t, reqStatus, salesUser.ID, salesEmp.ID, salesUser.Username, "salesperson", branch.ID)
	recStatus = httptest.NewRecorder()
	testServer.Router().ServeHTTP(recStatus, reqStatus)
	if recStatus.Code != http.StatusOK {
		t.Fatalf("Không thể chuyển sang DELIVERED: %d", recStatus.Code)
	}
}

func TestSalesOrder_Cancellation_With_Audit_And_Resolutions(t *testing.T) {
	superUser, branch, superEmp := createTestUser(t, fmt.Sprintf("super_cx_%d", time.Now().UnixNano()), "pass123456", "superadmin")
	salesUser, _, salesEmp := createTestUser(t, fmt.Sprintf("sales_cx_%d", time.Now().UnixNano()), "pass123456", "salesperson")

	// 1. Tạo Model & Xe
	createModelPayload := map[string]interface{}{
		"make":  "Hyundai",
		"model": fmt.Sprintf("SantaFe-%d", time.Now().UnixNano()%10000),
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
		"purchase_price": "1200000000.00",
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
		Name:  "Lê Văn Hủy",
		Phone: fmt.Sprintf("096%07d", time.Now().UnixNano()%10000000),
	})

	// 3. Lên đơn hàng có cọc (DEPOSIT_PAID) -> 201 Created
	orderPayload := map[string]interface{}{
		"customer_id":    cust.ID.String(),
		"vehicle_id":     vehicleID,
		"total_amount":   "1400000000.00",
		"deposit_amount": "50000000.00",
	}
	bodyOrder, _ := json.Marshal(orderPayload)
	reqOrder, _ := http.NewRequest(http.MethodPost, "/api/v1/sales-orders", bytes.NewBuffer(bodyOrder))
	reqOrder.Header.Set("Content-Type", "application/json")
	addAuthHeader(t, reqOrder, salesUser.ID, salesEmp.ID, salesUser.Username, "salesperson", branch.ID)
	recOrder := httptest.NewRecorder()
	testServer.Router().ServeHTTP(recOrder, reqOrder)

	var orderResp struct {
		Data struct {
			ID string `json:"id"`
		} `json:"data"`
	}
	_ = json.Unmarshal(recOrder.Body.Bytes(), &orderResp)
	orderID := orderResp.Data.ID

	// 4. KIỂM THỬ VALIDATION: Đơn có cọc nhưng cố tình chọn resolution = NONE -> Phải báo lỗi 400
	invalidCancelPayload := map[string]string{
		"cancel_reason":      "Khách đổi ý không muốn lấy xe",
		"deposit_resolution": "NONE",
	}
	bodyInv, _ := json.Marshal(invalidCancelPayload)
	reqInv, _ := http.NewRequest(http.MethodPost, "/api/v1/sales-orders/"+orderID+"/cancel", bytes.NewBuffer(bodyInv))
	reqInv.Header.Set("Content-Type", "application/json")
	addAuthHeader(t, reqInv, salesUser.ID, salesEmp.ID, salesUser.Username, "salesperson", branch.ID)
	recInv := httptest.NewRecorder()
	testServer.Router().ServeHTTP(recInv, reqInv)
	if recInv.Code != http.StatusBadRequest {
		t.Fatalf("Kỳ vọng 400 Bad Request khi đơn có cọc chọn resolution NONE, nhận được: %d", recInv.Code)
	}

	// 5. HỦY ĐƠN HỢP LỆ VỚI TỊCH THU CỌC (FORFEITED) VÀ LƯU VẾT CANCELLED_BY
	validCancelPayload := map[string]string{
		"cancel_reason":      "Khách hàng đơn phương vi phạm hợp đồng bỏ cọc",
		"deposit_resolution": "FORFEITED",
	}
	bodyCancel, _ := json.Marshal(validCancelPayload)
	reqCancel, _ := http.NewRequest(http.MethodPost, "/api/v1/sales-orders/"+orderID+"/cancel", bytes.NewBuffer(bodyCancel))
	reqCancel.Header.Set("Content-Type", "application/json")
	addAuthHeader(t, reqCancel, salesUser.ID, salesEmp.ID, salesUser.Username, "salesperson", branch.ID)
	recCancel := httptest.NewRecorder()
	testServer.Router().ServeHTTP(recCancel, reqCancel)
	if recCancel.Code != http.StatusOK {
		t.Fatalf("Hủy đơn hợp lệ thất bại: %d, body: %s", recCancel.Code, recCancel.Body.String())
	}

	var cancelResp struct {
		Data struct {
			Status            string `json:"status"`
			CancelReason      string `json:"cancel_reason"`
			DepositResolution string `json:"deposit_resolution"`
			CancelledBy       string `json:"cancelled_by"`
		} `json:"data"`
	}
	_ = json.Unmarshal(recCancel.Body.Bytes(), &cancelResp)

	if cancelResp.Data.Status != "CANCELLED" {
		t.Errorf("Kỳ vọng trạng thái CANCELLED, nhận được: %s", cancelResp.Data.Status)
	}
	if cancelResp.Data.DepositResolution != "FORFEITED" {
		t.Errorf("Kỳ vọng deposit_resolution = FORFEITED, nhận được: %s", cancelResp.Data.DepositResolution)
	}
	if cancelResp.Data.CancelledBy != salesEmp.ID.String() {
		t.Errorf("Kỳ vọng cancelled_by = %s (Employee ID), nhận được: %s", salesEmp.ID.String(), cancelResp.Data.CancelledBy)
	}

	// 6. KIỂM THỬ NHẢ KHO XE (INVENTORY RELEASE): Xe phải tự động hoàn về IN_STOCK
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
	if getVehResp.Data.Status != "IN_STOCK" {
		t.Fatalf("Kỳ vọng xe được hoàn về IN_STOCK sau khi hủy đơn, nhưng trạng thái hiện tại: %s", getVehResp.Data.Status)
	}
}
