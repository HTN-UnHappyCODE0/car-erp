# Kế Hoạch 01: Thiết Kế DB Schema & Thực Thi Migration Ban Đầu

## 1. Tổng Quan & Mục Tiêu
- **Mục tiêu**: Thiết lập cấu trúc cơ sở dữ liệu PostgreSQL cho hệ thống Car ERP (Quản lý đại lý ô tô, showroom, nhân sự, bán hàng, sửa chữa và tài chính).
- **Nguồn thiết kế**: [careerpdoc.md](../careerpdoc.md).
- **Môi trường Database Test**: `postgresql://erp_admin:supersecret@192.168.0.159:5434/erp_automotive?sslmode=disable`.

---

## 2. Cấu Trúc Các Phân Hệ Dữ Liệu (15 Bảng)

```mermaid
erDiagram
    BRANCHES ||--o{ EMPLOYEES : "has"
    DEPARTMENTS ||--o{ EMPLOYEES : "belongs_to"
    EMPLOYEES ||--o| USERS : "has_account"
    BRANCHES ||--o{ VEHICLES : "stores"
    VEHICLE_MODELS ||--o{ VEHICLES : "model_spec"
    BRANCHES ||--o{ LEADS : "receives"
    CUSTOMERS ||--o{ LEADS : "source"
    CAMPAIGNS ||--o{ LEADS : "from_campaign"
    EMPLOYEES ||--o{ LEADS : "assigned_to"
    BRANCHES ||--o{ SALES_ORDERS : "issues"
    CUSTOMERS ||--o{ SALES_ORDERS : "orders"
    EMPLOYEES ||--o{ SALES_ORDERS : "handled_by"
    VEHICLES ||--o| SALES_ORDERS : "assigned_vin"
    SALES_ORDERS ||--o| CONTRACTS : "has_contract"
    BRANCHES ||--o{ INVOICES : "issues"
    SALES_ORDERS ||--o| INVOICES : "billed_from"
    INVOICES ||--o{ TRANSACTIONS : "paid_by"
    BRANCHES ||--o{ REPAIR_ORDERS : "serviced_at"
    CUSTOMERS ||--o{ REPAIR_ORDERS : "owns_car"
    VEHICLES ||--o{ REPAIR_ORDERS : "serviced_vehicle"
    EMPLOYEES ||--o{ REPAIR_ORDERS : "service_advisor"
    EMPLOYEES ||--o{ REPAIR_ORDERS : "mechanic"
    REPAIR_ORDERS ||--o{ REPAIR_ORDER_ITEMS : "contains"
```

### Chi tiết các phân hệ:
1. **Tổ chức & Nhân sự (HR & Organization)**:
   - `branches`: Quản lý đại lý, showroom, chi nhánh phân phối.
   - `departments`: Các phòng ban (Sales, Service, Finance, HR,...).
   - `employees`: Thông tin nhân viên trực thuộc chi nhánh và phòng ban.
   - `users`: Tài khoản đăng nhập hệ thống, phân quyền RBAC (`superadmin`, `branch_manager`, `salesperson`, `accountant`, `mechanic`).

2. **Sản phẩm & Kho xe (Vehicle Inventory)**:
   - `vehicle_models`: Danh mục model xe từ nhà sản xuất, lưu specs dạng JSONB kèm GIN Index.
   - `vehicles`: Từng xe cụ thể trong kho định danh theo số VIN duy nhất, số máy, màu sắc, giá nhập và trạng thái kho (`IN_TRANSIT`, `IN_STOCK`, `RESERVED`, `SOLD`, `MAINTENANCE`).

3. **Marketing & Bán hàng (CRM & Sales)**:
   - `campaigns`: Chiến dịch marketing và ngân sách.
   - `customers`: Thông tin khách hàng cá nhân / doanh nghiệp.
   - `leads`: Cơ hội bán hàng, nguồn chiến dịch, theo dõi luồng tư vấn và lái thử.
   - `sales_orders`: Đơn đặt cọc/mua xe, liên kết số VIN cụ thể.
   - `contracts`: Hợp đồng mua bán xe, lưu trữ đường dẫn file hợp đồng PDF.

4. **Tài chính & Dòng tiền (Finance & Cashflow)**:
   - `invoices`: Hóa đơn thanh toán cho đơn mua xe hoặc dịch vụ sửa chữa.
   - `transactions`: Lịch sử giao dịch tiền mặt, chuyển khoản, trả góp.

5. **Dịch vụ & Bảo dưỡng (After-sales Service)**:
   - `repair_orders`: Lệnh sửa chữa/bảo dưỡng xe, ghi nhận số ODO, chẩn đoán, cố vấn dịch vụ và kỹ thuật viên.
   - `repair_order_items`: Chi tiết phụ tùng thay thế và tiền công thợ, tự động tính `subtotal` bằng GENERATED COLUMN (`quantity * unit_price`).

---

## 3. Các File Migration
- **Up Migration**: `BE/db/migration/000001_init_schema.up.sql`
- **Down Migration**: `BE/db/migration/000001_init_schema.down.sql`

---

## 4. Thực Thi Migration & Kiểm Tra
- Sử dụng công cụ `golang-migrate`:
```bash
migrate -path BE/db/migration -database "postgresql://erp_admin:supersecret@192.168.0.159:5434/erp_automotive?sslmode=disable" up
```
