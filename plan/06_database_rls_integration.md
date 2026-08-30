# Kế Hoạch 06: Ghép Nối Middleware Với Row-Level Security (RLS) PostgreSQL Cho Multi-Tenant

## 1. Mục Tiêu & Cơ Chế Hoạt Động (Architecture Overview)

**Nguyên lý bảo mật 2 lớp (Defense in Depth)**:
1. **Lớp 1 (Application Level)**: `TenantEnforcementMiddleware` trong Go trích xuất `branch_id` và `role` từ JWT, lưu vào `context.Context`.
2. **Lớp 2 (Database Engine Level)**: PostgreSQL tự động thực thi **Row-Level Security (RLS)** trên từng câu lệnh `SELECT`, `INSERT`, `UPDATE`, `DELETE`. Dù lập trình viên có quên thêm `WHERE branch_id = ...`, Database vẫn **tuyệt đối không trả về dữ liệu của chi nhánh khác**.

---

## 2. Sơ Đồ Luồng Tích Hợp (Integration Sequence Flow)

```mermaid
sequenceDiagram
    autonumber
    actor Client as Frontend / User
    participant MW as Tenant Middleware
    participant Ctx as Go Request Context
    participant Store as SQLStore (pgxpool)
    participant PG as PostgreSQL (RLS Engine)

    Client->>MW: Request (Header: Bearer JWT, X-Branch-ID)
    MW->>Ctx: contextutil.WithTenant(ctx, branchID, userID, role)
    MW->>Store: Gọi nghiệp vụ qua Store.ExecTx(ctx, fn)
    
    Note over Store,PG: 1. Khởi tạo Transaction & Thiết lập Ngữ cảnh RLS cục bộ
    Store->>PG: BEGIN TRANSACTION;
    Store->>PG: SET LOCAL ROLE erp_app;
    Store->>PG: SELECT set_config('app.current_branch_id', $1, true), set_config('app.current_user_role', $2, true);
    
    Note over Store,PG: 2. Thực thi Query (RLS Policy tự động áp dụng)
    Store->>PG: SELECT * FROM vehicles; (Không cần WHERE branch_id)
    PG-->>Store: Chỉ trả về xe thuộc đúng chi nhánh (hoặc tất cả nếu role = 'superadmin')
    
    Note over Store,PG: 3. Kết thúc Transaction & Tự động dọn sạch kết nối
    Store->>PG: COMMIT; (set_config 'is_local=true' tự động biến mất, Connection Pool an toàn 100%)
    Store-->>Client: 200 OK (Data cách ly an toàn)
```

---

## 3. Danh Sách 7 Bảng Nghiệp Vụ Được Bảo Vệ Bằng RLS
1. `employees` (Nhân sự chi nhánh)
2. `vehicles` (Kho xe theo chi nhánh)
3. `leads` (Cơ hội bán hàng)
4. `sales_orders` (Đơn đặt cọc/bán xe)
5. `invoices` (Hóa đơn)
6. `transactions` (Lịch sử dòng tiền)
7. `repair_orders` (Lệnh sửa chữa dịch vụ)

---

## 4. Các Thành Phần Đã Triển Khai

### 🗄️ Database Migration
- **UP**: [`BE/db/migration/000003_enable_rls.up.sql`](file:///d:/project/bad-idea/car-erp/BE/db/migration/000003_enable_rls.up.sql): Tạo role `erp_app`, kích hoạt RLS và tạo chính sách `branch_isolation_policy` cho 7 bảng nghiệp vụ.
- **DOWN**: [`BE/db/migration/000003_enable_rls.down.sql`](file:///d:/project/bad-idea/car-erp/BE/db/migration/000003_enable_rls.down.sql).

### ⚙️ Database Access Layer (Store & pgxpool)
- [`BE/db/sqlc/store.go`](file:///d:/project/bad-idea/car-erp/BE/db/sqlc/store.go): `ExecTx` tự động chạy `SET LOCAL ROLE erp_app` và `set_config('app.current_branch_id', $1, true)` cùng `set_config('app.current_user_role', $2, true)`.

---

## 5. Kết Quả Kiểm Thử (Integration Tests)
Đã kiểm thử thực tế tại [`BE/db/sqlc/rls_test.go`](file:///d:/project/bad-idea/car-erp/BE/db/sqlc/rls_test.go):
- **`TestRLS_Vehicle_Isolation`**: **PASS** (0.13s)
  1. User Branch A chỉ xem được xe thuộc Branch A, hoàn toàn không thấy xe Branch B (`ErrNoRows`).
  2. User Branch B chỉ xem được xe thuộc Branch B, hoàn toàn không thấy xe Branch A (`ErrNoRows`).
  3. User Superadmin xem được toàn bộ xe của tất cả chi nhánh.
  4. Sau khi Transaction kết thúc, connection pool không bị lưu vết biến session cũ.
