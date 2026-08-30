package db

import (
	"context"
	"fmt"
	"testing"
	"time"

	"erp-backend/internal/contextutil"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgtype"
)

func TestRLS_Vehicle_Isolation(t *testing.T) {
	ctx := context.Background()

	// 1. Tạo 2 chi nhánh khác nhau: Branch A và Branch B
	branchA, err := testStore.CreateBranch(ctx, CreateBranchParams{
		Name: "Chi Nhánh Hà Nội (Branch A)",
		Code: fmt.Sprintf("CN-HN-%d", time.Now().UnixNano()),
	})
	if err != nil {
		t.Fatalf("CreateBranch A thất bại: %v", err)
	}

	branchB, err := testStore.CreateBranch(ctx, CreateBranchParams{
		Name: "Chi Nhánh Sài Gòn (Branch B)",
		Code: fmt.Sprintf("CN-SG-%d", time.Now().UnixNano()),
	})
	if err != nil {
		t.Fatalf("CreateBranch B thất bại: %v", err)
	}

	// 2. Tạo dòng xe dùng chung (Vehicle Model)
	model, err := testStore.CreateVehicleModel(ctx, CreateVehicleModelParams{
		Make:  "Toyota",
		Model: "Camry 2.5Q",
		Year:  2026,
	})
	if err != nil {
		t.Fatalf("CreateVehicleModel thất bại: %v", err)
	}

	// 3. Tạo xe thuộc Branch A (dùng ngữ cảnh Superadmin để tạo)
	var vehicleA, vehicleB Vehicle
	superAdminCtx := contextutil.WithTenant(ctx, uuid.Nil, uuid.New(), "superadmin")

	var priceA, priceB pgtype.Numeric
	_ = priceA.Scan("1000000000.00")
	_ = priceB.Scan("1200000000.00")

	err = testStore.ExecTx(superAdminCtx, func(q *Queries) error {
		var createErr error
		vehicleA, createErr = q.CreateVehicle(superAdminCtx, CreateVehicleParams{
			BranchID:      branchA.ID,
			ModelID:       model.ID,
			Vin:           fmt.Sprintf("VIN-A-%d", time.Now().UnixNano()%100000000),
			Status:        "IN_STOCK",
			PurchasePrice: priceA,
		})
		if createErr != nil {
			return createErr
		}

		vehicleB, createErr = q.CreateVehicle(superAdminCtx, CreateVehicleParams{
			BranchID:      branchB.ID,
			ModelID:       model.ID,
			Vin:           fmt.Sprintf("VIN-B-%d", time.Now().UnixNano()%100000000),
			Status:        "IN_STOCK",
			PurchasePrice: priceB,
		})
		return createErr
	})
	if err != nil {
		t.Fatalf("Khởi tạo dữ liệu xe thất bại: %v", err)
	}

	// --- KIỂM THỬ 1: User thuộc Branch A chỉ nhìn thấy xe Branch A ---
	branchACtx := contextutil.WithTenant(ctx, branchA.ID, uuid.New(), "salesperson")
	err = testStore.ExecTx(branchACtx, func(q *Queries) error {
		// Thử lấy xe A
		gotA, err := q.GetVehicle(branchACtx, vehicleA.ID)
		if err != nil {
			return fmt.Errorf("User Branch A không tìm thấy xe của chi nhánh mình: %w", err)
		}
		if gotA.ID != vehicleA.ID {
			return fmt.Errorf("Xe lấy về không đúng ID xe A")
		}

		// Thử lấy xe B (của chi nhánh khác) -> RLS phải ẩn hoàn toàn xe B (trả về ErrNoRows)
		_, err = q.GetVehicle(branchACtx, vehicleB.ID)
		if err == nil {
			return fmt.Errorf("LỖI BẢO MẬT RLS: User Branch A lại đọc được xe của Branch B!")
		}

		return nil
	})
	if err != nil {
		t.Fatalf("Kiểm thử Branch A thất bại: %v", err)
	}

	// --- KIỂM THỬ 2: User thuộc Branch B chỉ nhìn thấy xe Branch B ---
	branchBCtx := contextutil.WithTenant(ctx, branchB.ID, uuid.New(), "salesperson")
	err = testStore.ExecTx(branchBCtx, func(q *Queries) error {
		// Thử lấy xe B
		gotB, err := q.GetVehicle(branchBCtx, vehicleB.ID)
		if err != nil {
			return fmt.Errorf("User Branch B không tìm thấy xe của chi nhánh mình: %w", err)
		}
		if gotB.ID != vehicleB.ID {
			return fmt.Errorf("Xe lấy về không đúng ID xe B")
		}

		// Thử lấy xe A -> RLS phải chặn
		_, err = q.GetVehicle(branchBCtx, vehicleA.ID)
		if err == nil {
			return fmt.Errorf("LỖI BẢO MẬT RLS: User Branch B lại đọc được xe của Branch A!")
		}

		return nil
	})
	if err != nil {
		t.Fatalf("Kiểm thử Branch B thất bại: %v", err)
	}

	// --- KIỂM THỬ 3: User Superadmin xem được toàn bộ xe của cả 2 chi nhánh ---
	err = testStore.ExecTx(superAdminCtx, func(q *Queries) error {
		_, errA := q.GetVehicle(superAdminCtx, vehicleA.ID)
		if errA != nil {
			return fmt.Errorf("Superadmin không xem được xe A: %w", errA)
		}
		_, errB := q.GetVehicle(superAdminCtx, vehicleB.ID)
		if errB != nil {
			return fmt.Errorf("Superadmin không xem được xe B: %w", errB)
		}
		return nil
	})
	if err != nil {
		t.Fatalf("Kiểm thử Superadmin thất bại: %v", err)
	}
}
