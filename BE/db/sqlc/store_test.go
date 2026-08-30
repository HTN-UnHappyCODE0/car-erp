package db

import (
	"context"
	"errors"
	"fmt"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgtype"
)

func randomCode() string {
	return fmt.Sprintf("CN-TEST-%d", time.Now().UnixNano())
}

func TestCreateAndGetBranch(t *testing.T) {
	ctx := context.Background()

	branchCode := randomCode()
	name := "Chi nhánh Test Sài Gòn"
	addr := "123 Đường Test, Q1, TP.HCM"
	tax := "0301234567"
	phone := "0909123456"
	status := "ACTIVE"

	branch, err := testStore.CreateBranch(ctx, CreateBranchParams{
		Name:    name,
		Code:    branchCode,
		Address: pgtype.Text{String: addr, Valid: true},
		TaxCode: pgtype.Text{String: tax, Valid: true},
		Phone:   pgtype.Text{String: phone, Valid: true},
		Status:  pgtype.Text{String: status, Valid: true},
	})
	if err != nil {
		t.Fatalf("CreateBranch thất bại: %v", err)
	}

	if branch.Code != branchCode {
		t.Errorf("Kỳ vọng branch code %s, nhận được %s", branchCode, branch.Code)
	}

	// Lấy lại branch vừa tạo
	gotBranch, err := testStore.GetBranch(ctx, branch.ID)
	if err != nil {
		t.Fatalf("GetBranch thất bại: %v", err)
	}

	if gotBranch.ID != branch.ID {
		t.Errorf("Kỳ vọng branch ID %v, nhận được %v", branch.ID, gotBranch.ID)
	}
}

func TestExecTx_SuccessAndRollback(t *testing.T) {
	ctx := context.Background()

	// 1. Kiểm tra Transaction thành công (Commit)
	branchCode := randomCode()
	var createdBranchID uuid.UUID

	err := testStore.ExecTx(ctx, func(q *Queries) error {
		name := "Chi nhánh Transaction Commit"
		b, err := q.CreateBranch(ctx, CreateBranchParams{
			Name: name,
			Code: branchCode,
		})
		if err != nil {
			return err
		}
		createdBranchID = b.ID
		return nil
	})

	if err != nil {
		t.Fatalf("ExecTx thành công kỳ vọng nil error, nhận được: %v", err)
	}

	// Xác nhận dữ liệu đã được commit vào database
	branch, err := testStore.GetBranch(ctx, createdBranchID)
	if err != nil {
		t.Fatalf("GetBranch sau khi commit thất bại: %v", err)
	}
	if branch.Code != branchCode {
		t.Errorf("Kỳ vọng code %s, nhận được %s", branchCode, branch.Code)
	}

	// 2. Kiểm tra Transaction Rollback khi có lỗi
	rollbackCode := randomCode()
	errExpected := errors.New("lỗi giả lập buộc phải rollback")

	err = testStore.ExecTx(ctx, func(q *Queries) error {
		name := "Chi nhánh Transaction Rollback"
		_, err := q.CreateBranch(ctx, CreateBranchParams{
			Name: name,
			Code: rollbackCode,
		})
		if err != nil {
			return err
		}
		// Trả về lỗi để kích hoạt Rollback
		return errExpected
	})

	if !errors.Is(err, errExpected) {
		t.Fatalf("Kỳ vọng lỗi %v, nhận được: %v", errExpected, err)
	}

	// Xác nhận dữ liệu KHÔNG tồn tại trong database (đã được rollback)
	_, err = testStore.GetBranchByCode(ctx, rollbackCode)
	if err == nil {
		t.Fatalf("Kỳ vọng không tìm thấy branch %s do đã rollback, nhưng lại tìm thấy!", rollbackCode)
	}
}
