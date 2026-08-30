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

func TestBranchManager_TransferVehicle_RLS_Check(t *testing.T) {
	// 1. Tạo 2 chi nhánh: Branch A và Branch B
	mgrA, branchA, empA := createTestUser(t, fmt.Sprintf("mgrA_tf_%d", time.Now().UnixNano()), "pass123456", "branch_manager")
	mgrB, branchB, empB := createTestUser(t, fmt.Sprintf("mgrB_tf_%d", time.Now().UnixNano()), "pass123456", "branch_manager")

	superadminID := uuid.New()
	superEmpID := uuid.New()

	// 2. Tạo Model xe
	createModelPayload := map[string]interface{}{
		"make":  "Toyota",
		"model": fmt.Sprintf("Cross-%d", time.Now().UnixNano()%10000),
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

	// 3. Nhập xe vào Branch A
	vin := fmt.Sprintf("VIN%014d", time.Now().UnixNano()%100000000000000)
	branchAIDStr := branchA.ID.String()
	vehiclePayload := map[string]interface{}{
		"branch_id":      &branchAIDStr,
		"model_id":       modelID,
		"vin":            vin,
		"purchase_price": "800000000.00",
		"status":         "IN_STOCK",
	}
	bodyVeh, _ := json.Marshal(vehiclePayload)
	reqVeh, _ := http.NewRequest(http.MethodPost, "/api/v1/vehicles", bytes.NewBuffer(bodyVeh))
	reqVeh.Header.Set("Content-Type", "application/json")
	addAuthHeader(t, reqVeh, mgrA.ID, empA.ID, mgrA.Username, "branch_manager", branchA.ID)

	recVeh := httptest.NewRecorder()
	testServer.Router().ServeHTTP(recVeh, reqVeh)
	if recVeh.Code != http.StatusCreated {
		t.Fatalf("Branch Manager không tạo được xe: %d, body: %s", recVeh.Code, recVeh.Body.String())
	}

	var vehResp struct {
		Data struct {
			ID string `json:"id"`
		} `json:"data"`
	}
	_ = json.Unmarshal(recVeh.Body.Bytes(), &vehResp)
	vehicleID := vehResp.Data.ID

	// 4. Branch Manager B cố tình điều chuyển xe của Branch A -> Phải bị từ chối (400 Bad Request / 500 error message)
	transferPayload := map[string]string{
		"to_branch_id": branchB.ID.String(),
	}
	bodyTransfer, _ := json.Marshal(transferPayload)
	reqInvalidTransfer, _ := http.NewRequest(http.MethodPost, "/api/v1/vehicles/"+vehicleID+"/transfer", bytes.NewBuffer(bodyTransfer))
	reqInvalidTransfer.Header.Set("Content-Type", "application/json")
	addAuthHeader(t, reqInvalidTransfer, mgrB.ID, empB.ID, mgrB.Username, "branch_manager", branchB.ID)

	recInvalidTransfer := httptest.NewRecorder()
	testServer.Router().ServeHTTP(recInvalidTransfer, reqInvalidTransfer)
	if recInvalidTransfer.Code == http.StatusOK {
		t.Fatalf("LỖI: Manager B không sở hữu xe lại điều chuyển được xe của Manager A!")
	}

	// 5. Branch Manager A hợp lệ thực hiện điều chuyển xe sang Branch B -> Phải thành công (200 OK)
	reqValidTransfer, _ := http.NewRequest(http.MethodPost, "/api/v1/vehicles/"+vehicleID+"/transfer", bytes.NewBuffer(bodyTransfer))
	reqValidTransfer.Header.Set("Content-Type", "application/json")
	addAuthHeader(t, reqValidTransfer, mgrA.ID, empA.ID, mgrA.Username, "branch_manager", branchA.ID)

	recValidTransfer := httptest.NewRecorder()
	testServer.Router().ServeHTTP(recValidTransfer, reqValidTransfer)
	if recValidTransfer.Code != http.StatusOK {
		t.Fatalf("Kỳ vọng 200 OK khi Manager A điều chuyển xe của mình, nhận được: %d, body: %s", recValidTransfer.Code, recValidTransfer.Body.String())
	}
}
