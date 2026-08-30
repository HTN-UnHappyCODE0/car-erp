# Kế Hoạch 03: Thiết Lập Kết Nối PostgreSQL An Toàn Với Connection Pool (pgxpool) Cho Hệ Thống Multi-Tenant

## 1. Bối Cảnh & Thách Thức Trong Hệ Thống Car ERP
Hệ thống quản lý đại lý ô tô (Automotive ERP) có đặc thù:
- **Tải truy vấn đồng thời cao**: Hàng trăm nhân viên Sales, Thu ngân, Cố vấn dịch vụ và Kỹ thuật viên thao tác cùng lúc qua nhiều chi nhánh/showroom.
- **Nhiều chi nhánh (Multi-Branch / Multi-Tenant)**: Cần đảm bảo dữ liệu giữa các đại lý/chi nhánh được phân tách tuyệt đối an toàn, tránh rò rỉ dữ liệu khách hàng, doanh số, kho xe.
- **Xử lý giao dịch phức tạp (ACID Transactions)**: Quy trình bán xe, cọc xe, xuất hóa đơn, xuất phụ tùng đòi hỏi Transaction chặt chẽ không gây nghẽn kết nối (Connection Starvation).

---

## 2. Chiến Lược Multi-Tenancy Phù Hợp

| Tiêu chí | Mô hình 1: Database-per-Tenant | Mô hình 2: Schema-per-Tenant | Mô hình 3: Shared Database + Row-Level (`branch_id`) |
|---|---|---|---|
| **Cơ chế** | Mỗi chi nhánh 1 DB riêng | Mỗi chi nhánh 1 Schema riêng | Chung DB & Schema, lọc qua `branch_id` |
| **Quản lý Pool** | Cần quản lý N pool riêng biệt, tốn RAM | Switch `search_path`, dễ lỗi state connection | **1 Pool duy nhất dùng chung**, tối ưu tài nguyên tối đa |
| **Chi phí hạ tầng** | Rất cao | Trung bình | **Thấp nhất, mở rộng tốt nhất** |
| **Độ phức tạp migration** | Rất phức tạp (chạy N lần) | Phức tạp (chạy N schema) | **Đơn giản nhất (1 lần chạy `migrate`)** |
| **Khuyến nghị cho Car ERP** | Không cần thiết | Phù hợp khi yêu cầu customize schema | ⭐ **Khuyến nghị chuẩn nhất (Kết hợp RLS)** |

> **Quyết định kiến trúc**: Sử dụng **Shared Database với `branch_id`** làm Tenant Identifier (đã được định nghĩa sẵn trong [`careerpdoc.md`](../careerpdoc.md)), kết hợp **PostgreSQL Row-Level Security (RLS)** và **Application-level Context Filtering**.

---

## 3. Cấu Trúc Connection Pool Chuẩn Với `pgxpool` (`github.com/jackc/pgx/v5/pgxpool`)

### 3.1. Bảng thông số Connection Pool chuẩn Production
- **`MaxConns` (25 - 50)**: Giới hạn số kết nối đồng thời tối đa theo công thức `(CPU Cores * 2) + SSD Spindles`.
- **`MinConns` (5 - 10)**: Duy trì kết nối rảnh rỗi khởi động sẵn.
- **`MaxConnLifetime` (30m - 1h)**: Tự động recycle kết nối định kỳ.
- **`MaxConnIdleTime` (5m - 15m)**: Đóng kết nối nhàn rỗi vượt ngưỡng.
- **`HealthCheckPeriod` (1m)**: Ping định kỳ phát hiện kết nối chết ngầm.
- **`ConnectTimeout` (5s)**: Tránh nghẽn thread khi kết nối ban đầu.

---

## 4. Các Thành Phần Mã Nguồn Đã Triển Khai
1. **Cấu hình tập trung**: [`BE/internal/config/config.go`](file:///d:/project/bad-idea/car-erp/BE/internal/config/config.go)
2. **PostgreSQL Connection Pool**: [`BE/internal/database/postgres.go`](file:///d:/project/bad-idea/car-erp/BE/internal/database/postgres.go)
3. **Tenant Context Utilities**: [`BE/internal/contextutil/tenant.go`](file:///d:/project/bad-idea/car-erp/BE/internal/contextutil/tenant.go)
4. **Tenant HTTP Middleware**: [`BE/internal/middleware/tenant.go`](file:///d:/project/bad-idea/car-erp/BE/internal/middleware/tenant.go)
5. **Store & ACID Transaction (`ExecTx`)**: [`BE/db/sqlc/store.go`](file:///d:/project/bad-idea/car-erp/BE/db/sqlc/store.go)
6. **Entrypoint HTTP Server & Graceful Shutdown**: [`BE/cmd/server/main.go`](file:///d:/project/bad-idea/car-erp/BE/cmd/server/main.go)
7. **Automated Integration Tests**: [`BE/db/sqlc/store_test.go`](file:///d:/project/bad-idea/car-erp/BE/db/sqlc/store_test.go)

---

## 5. Kết Quả Kiểm Thử Tự Động (Integration Test Results)
- Đã chạy kiểm thử trực tiếp trên Database Test `postgresql://erp_admin:supersecret@192.168.0.159:5434/erp_automotive`:
  - `TestCreateAndGetBranch`: **PASS** (Tạo và đọc branch qua Store).
  - `TestExecTx_SuccessAndRollback`: **PASS** (Xác nhận Commit thành công và Rollback an toàn khi có lỗi xảy ra).
