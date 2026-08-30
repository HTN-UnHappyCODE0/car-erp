# ⚙️ Đặc Tả Kỹ Thuật Backend Car ERP (Backend Specs)

Tài liệu này tổng hợp toàn bộ đặc tả API, Schema dữ liệu, State Machines và quy tắc nghiệp vụ của phân hệ **Backend (`BE/`)** để Frontend tương tác chính xác 100%.

---

## 1. Chuẩn Phản Hồi API (API Response Format)

Mọi HTTP response trả về từ Gin Server đều có định dạng chuẩn:
```json
{
  "success": true,
  "data": { ... },
  "message": "Thông báo từ hệ thống",
  "error": null
}
```

Khi có lỗi:
```json
{
  "success": false,
  "data": null,
  "message": "Mô tả lỗi tổng quan",
  "error": "Chi tiết lỗi kỹ thuật hoặc validation"
}
```

---

## 2. Danh Sách Phân Hệ & Endpoints

### A. Xác Thực & Người Dùng (`/api/v1/auth`)
- `POST /api/v1/auth/login`: `{ username, password }` ➔ Trả về `access_token`, `refresh_token`, `user`, `session_id`.
- `POST /api/v1/auth/renew`: `{ refresh_token }` ➔ Cấp lại `access_token` mới khi token cũ hết hạn (15 phút).
- `POST /api/v1/auth/logout`: `{ session_id }` ➔ Thu hồi phiên trong DB.
- `GET /api/v1/auth/me`: Lấy thông tin user hiện tại kèm `branch_id`, `role`.

### B. Chi Nhánh & Đa Chi Nhánh (`/api/v1/branches`)
- `GET /api/v1/branches`: Danh sách chi nhánh (Superadmin xem hết, nhân viên xem chi nhánh của mình).
- `GET /api/v1/branches/:id`: Chi tiết chi nhánh.
- `POST /api/v1/branches`: Tạo chi nhánh mới (Quyền: `superadmin`).

### C. Danh Mục Dòng Xe (`/api/v1/vehicle-models`)
- `GET /api/v1/vehicle-models`: Danh sách dòng xe (Make, Model, Year, Trim, Specifications JSONB).
- `POST /api/v1/vehicle-models`: Thêm dòng xe mới (Quyền: `superadmin`).
- `PATCH /api/v1/vehicle-models/:id`: Cập nhật dòng xe.
- `DELETE /api/v1/vehicle-models/:id`: Xóa dòng xe.

### D. Kho Xe Vật Lý Theo Số VIN (`/api/v1/vehicles`)
- **Trạng thái xe**: `IN_TRANSIT` | `IN_STOCK` | `RESERVED` | `SOLD` | `MAINTENANCE`.
- `GET /api/v1/vehicles`: Danh sách xe trong kho (RLS tự động lọc theo `branch_id`).
- `GET /api/v1/vehicles/:id`: Chi tiết xe.
- `GET /api/v1/vehicles/vin/:vin`: Tra cứu theo số VIN 17 ký tự.
- `POST /api/v1/vehicles`: Nhập xe mới vào kho (`branch_id`, `model_id`, `vin`, `purchase_price`, `color_exterior`,...).
- `PATCH /api/v1/vehicles/:id/status`: Đổi trạng thái xe.
- `POST /api/v1/vehicles/:id/transfer`: `{ to_branch_id }` ➔ Điều chuyển xe sang chi nhánh khác trong ACID Transaction an toàn.

### E. CRM & Cơ Hội Bán Hàng (`/api/v1/customers`, `/api/v1/leads`)
- **Khách hàng**:
  - `POST /api/v1/customers`: `{ type: "INDIVIDUAL"|"ENTERPRISE", name, phone, email, id_card_number, address }`.
  - `GET /api/v1/customers`: Danh sách khách hàng (hỗ trợ search `?search=`).
  - `GET /api/v1/customers/phone/:phone`: Tra cứu nhanh hồ sơ khách hàng.
  - `PATCH /api/v1/customers/:id`: Cập nhật thông tin khách hàng.
- **Cơ hội bán hàng (Leads)**:
  - **Trạng thái**: `NEW` ➔ `CONTACTED` ➔ `TEST_DRIVE` ➔ `QUOTED` ➔ `WON` | `LOST`.
  - `POST /api/v1/leads`: `{ customer_id/phone, customer_name, campaign_id, assigned_to, interested_model_id, notes }`.
  - `GET /api/v1/leads`: Danh sách Lead chi nhánh.
  - `PATCH /api/v1/leads/:id/status`: Đổi trạng thái Lead.
  - `PATCH /api/v1/leads/:id/assign`: Phân bổ Lead cho nhân viên Sales.

### F. Đơn Bán Xe & Quản Lý Cọc (`/api/v1/sales-orders`)
- **Trạng thái**: `DRAFT` ➔ `DEPOSIT_PAID` ➔ `FULL_PAID` ➔ `DELIVERED` (hoặc `CANCELLED`).
- **Khóa bi quan**: Khi lên đơn bán xe, Backend tự động thực hiện `SELECT FOR UPDATE` trên số VIN xe và chuyển xe sang `RESERVED`.
- `POST /api/v1/sales-orders`: `{ customer_id, vehicle_id, total_amount, discount_amount, deposit_amount, lead_id }`.
- `GET /api/v1/sales-orders`: Danh sách đơn hàng chi nhánh.
- `PATCH /api/v1/sales-orders/:id/status`: Chuyển trạng thái theo đúng State Machine.
- `POST /api/v1/sales-orders/:id/cancel`: `{ cancel_reason, deposit_resolution: "NONE"|"FORFEITED"|"PENDING_REFUND"|"CREDITED" }` ➔ Hủy đơn, tự động mở khóa xe về lại `IN_STOCK`.

### G. Tài Chính, Hóa Đơn & Giao Dịch (`/api/v1/invoices`, `/api/v1/transactions`)
- **Trạng thái Hóa đơn**: `UNPAID` | `PARTIAL` | `PAID` | `OVERDUE`.
- `POST /api/v1/invoices`: `{ order_id / repair_order_id, invoice_number, amount, due_date }`.
- `GET /api/v1/invoices`: Danh sách hóa đơn.
- `POST /api/v1/invoices/:id/payments`: `{ payment_method: "CASH"|"BANK_TRANSFER"|"INSTALLMENT", amount, reference_code, note }` ➔ Ghi nhận thu tiền, tự động cập nhật State Machine đơn hàng sang `DEPOSIT_PAID` hoặc `FULL_PAID`.
- `GET /api/v1/transactions`: Xem nhật ký dòng tiền thực tế.

### H. Dịch Vụ & Xưởng Sửa Chữa (`/api/v1/repair-orders`)
- **Trạng thái**: `OPEN` ➔ `IN_PROGRESS` ➔ `COMPLETED` ➔ `INVOICED`.
- **Kiểm soát ODO**: Chống tua lùi số KM (nếu ODO mới < ODO cũ, bắt buộc có cờ `override_odometer: true` kèm lý do giải trình từ Branch Manager).
- `POST /api/v1/repair-orders`: `{ customer_id, vehicle_id, mechanic_id, odometer, symptoms, diagnosis, override_odometer, override_reason }`.
- `GET /api/v1/repair-orders`: Danh sách lệnh sửa chữa.
- `GET /api/v1/repair-orders/vehicle/:vehicle_id/history`: Toàn bộ lịch sử bảo dưỡng của xe.
- `PATCH /api/v1/repair-orders/:id/status`: Cập nhật trạng thái lệnh (chuyển sang `COMPLETED` bắt buộc phải có ít nhất 1 vật tư hoặc công thợ).
- `POST /api/v1/repair-orders/:id/items`: `{ item_type: "PART"|"LABOR", item_name, quantity, unit_price, part_id }` ➔ Thêm hạng mục, tự động tính lại `total_cost` nguyên tử dưới DB.
- `DELETE /api/v1/repair-orders/:id/items/:item_id`: Xóa hạng mục.
- `POST /api/v1/repair-orders/:id/invoice`: Xuất hóa đơn dịch vụ cho lệnh đã `COMPLETED`.
