package db

import (
	"context"
	"fmt"

	"erp-backend/internal/contextutil"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

// Store cung cấp toàn bộ các truy vấn của Querier cùng với tính năng quản lý Database Transaction & RLS
type Store interface {
	Querier
	ExecTx(ctx context.Context, fn func(*Queries) error) error
	ExecPrivilegedTx(ctx context.Context, fn func(*Queries) error) error
}

// SQLStore triển khai Store interface dựa trên pgxpool.Pool
type SQLStore struct {
	*Queries
	pool *pgxpool.Pool
}

// NewStore tạo một Store mới kết nối với pgxpool
func NewStore(pool *pgxpool.Pool) Store {
	return &SQLStore{
		Queries: New(pool),
		pool:    pool,
	}
}

// ExecTx thực thi một chuỗi các thao tác SQL bên trong một Database Transaction (ACID)
// đồng thời thiết lập vai trò erp_app và biến Session RLS cục bộ (is_local = true) dựa trên thông tin trong context.
func (s *SQLStore) ExecTx(ctx context.Context, fn func(*Queries) error) error {
	tx, err := s.pool.BeginTx(ctx, pgx.TxOptions{})
	if err != nil {
		return fmt.Errorf("không thể khởi tạo database transaction: %w", err)
	}

	// 1. Chuyển sang role ứng dụng erp_app để bắt buộc thực thi RLS policies
	_, roleErr := tx.Exec(ctx, "SET LOCAL ROLE erp_app")
	if roleErr != nil {
		_ = tx.Rollback(ctx)
		return fmt.Errorf("không thể chuyển sang application role erp_app: %w", roleErr)
	}

	// 2. Tự động inject RLS context nếu có trong Go Request Context
	branchID, bErr := contextutil.GetBranchID(ctx)
	role, rErr := contextutil.GetUserRole(ctx)

	branchVal := ""
	if bErr == nil && branchID != uuid.Nil {
		branchVal = branchID.String()
	}
	roleVal := ""
	if rErr == nil {
		roleVal = role
	}

	// is_local = true đảm bảo biến cấu hình tự động biến mất khi COMMIT/ROLLBACK
	_, setErr := tx.Exec(
		ctx,
		"SELECT set_config('app.current_branch_id', $1, true), set_config('app.current_user_role', $2, true)",
		branchVal,
		roleVal,
	)
	if setErr != nil {
		_ = tx.Rollback(ctx)
		return fmt.Errorf("lỗi thiết lập RLS session context: %w", setErr)
	}

	q := New(tx)
	err = fn(q)
	if err != nil {
		if rbErr := tx.Rollback(ctx); rbErr != nil {
			return fmt.Errorf("lỗi thực thi tx: %v, lỗi rollback: %v", err, rbErr)
		}
		return err
	}

	return tx.Commit(ctx)
}

// ExecPrivilegedTx thực thi Transaction với quyền superadmin (dùng cho các nghiệp vụ luân chuyển dữ liệu liên chi nhánh đã được kiểm duyệt nghiệp vụ)
func (s *SQLStore) ExecPrivilegedTx(ctx context.Context, fn func(*Queries) error) error {
	tx, err := s.pool.BeginTx(ctx, pgx.TxOptions{})
	if err != nil {
		return fmt.Errorf("không thể khởi tạo privileged transaction: %w", err)
	}

	// Chuyển sang role erp_app và set vai trò superadmin cục bộ
	_, setErr := tx.Exec(
		ctx,
		"SET LOCAL ROLE erp_app; SELECT set_config('app.current_branch_id', '', true), set_config('app.current_user_role', 'superadmin', true)",
	)
	if setErr != nil {
		_ = tx.Rollback(ctx)
		return fmt.Errorf("lỗi thiết lập privileged RLS session context: %w", setErr)
	}

	q := New(tx)
	err = fn(q)
	if err != nil {
		if rbErr := tx.Rollback(ctx); rbErr != nil {
			return fmt.Errorf("lỗi thực thi privileged tx: %v, lỗi rollback: %v", err, rbErr)
		}
		return err
	}

	return tx.Commit(ctx)
}
