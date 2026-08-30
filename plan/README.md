# 📑 Kế Hoạch Dự Án & Thiết Kế Kiến Trúc Automotive Car ERP

Thư mục `plan/` được sử dụng làm trung tâm lưu trữ toàn bộ các kế hoạch thiết kế kiến trúc, phân tích nghiệp vụ và lộ trình triển khai chi tiết cho cả hai phân hệ **Backend (Go)** và **Frontend (Next.js 15)** của hệ thống **Automotive Car ERP**.

---

## 🏛️ Danh Mục Kế Hoạch Hệ Thống

### 🔹 Phân Hệ Backend (Go + PostgreSQL RLS + sqlc)

| STT | Tài Liệu Kế Hoạch | Nội Dung Trọng Tâm | Trạng Thái |
|:---:|---|---|:---:|
| **01** | [01_database_schema_migration.md](./01_database_schema_migration.md) | Thiết kế DB Schema toàn diện & Migration PostgreSQL khởi tạo | ✅ Đã hoàn thành |
| **02** | [02_sqlc_configuration.md](./02_sqlc_configuration.md) | Cấu hình sqlc, queries SQL và sinh Go code type-safe (pgx/v5) | ✅ Đã hoàn thành |
| **03** | [03_postgres_connection_pool_and_multitenancy.md](./03_postgres_connection_pool_and_multitenancy.md) | Thiết lập kết nối pgxpool & kiến trúc Multi-Tenant | ✅ Đã hoàn thành |
| **04** | [04_gin_router_and_auth_middleware.md](./04_gin_router_and_auth_middleware.md) | Gin Router, Auth Middleware, JWT Maker & Phân quyền RBAC | ✅ Đã hoàn thành |
| **05** | [05_refresh_token_and_session_management.md](./05_refresh_token_and_session_management.md) | Cơ chế Silent Refresh Token & Quản lý bảng `sessions` | ✅ Đã hoàn thành |
| **06** | [06_database_rls_integration.md](./06_database_rls_integration.md) | Ghép nối Row-Level Security (RLS) PostgreSQL đa chi nhánh | ✅ Đã hoàn thành |
| **07** | [07_inventory_module_and_centralized_error_logging.md](./07_inventory_module_and_centralized_error_logging.md) | Module Inventory (VIN Kho xe) & Structured Logger slog JSON | ✅ Đã hoàn thành |
| **08** | [08_crm_and_sales_module.md](./08_crm_and_sales_module.md) | Phân hệ CRM & Đơn bán xe với State Machine & Khóa bi quan | ✅ Đã hoàn thành |
| **09** | [09_sales_order_cancellation_and_financial_resolution.md](./09_sales_order_cancellation_and_financial_resolution.md) | Luồng Hủy đơn hàng, mở khóa xe & Xử lý tiền cọc kế toán | ✅ Đã hoàn thành |
| **10** | [10_finance_invoices_and_payments.md](./10_finance_invoices_and_payments.md) | Phân hệ Tài chính, Hóa đơn & Sổ cái dòng tiền (Decimal) | ✅ Đã hoàn thành |
| **11** | [11_after_sales_service_module.md](./11_after_sales_service_module.md) | Phân hệ Xưởng dịch vụ, kiểm soát Odometer & Vật tư sửa chữa | ✅ Đã hoàn thành |

---

### 🔹 Phân Hệ Frontend (Next.js 15 + React 19 + TypeScript + FSD)

| STT | Tài Liệu Kế Hoạch | Nội Dung Trọng Tâm | Trạng Thái |
|:---:|---|---|:---:|
| **12** | [12_frontend_architecture_and_core_foundation.md](./12_frontend_architecture_and_core_foundation.md) | Kiến trúc nền tảng Next.js 15, FSD, Server Prefetching + Hydration, Zustand Persist UI, Shadcn UI | ✅ Đã hoàn thành |
| **13** | [13_frontend_auth_and_state_management.md](./13_frontend_auth_and_state_management.md) | Xác thực JWT, Zustand Auth Store (`persist`), Axios Interceptors (401 Redirect), Next.js Server Middleware | ✅ Đã hoàn thành |
| **14** | [14_frontend_enterprise_modules_and_workflows.md](./14_frontend_enterprise_modules_and_workflows.md) | Tổng quan các phân hệ nghiệp vụ ERP: Dashboard, Inventory, CRM, Sales, Service, Finance | ✅ Đã hoàn thành |
| **15** | [15_app_shell_navigation_and_rbac_sidebar.md](./15_app_shell_navigation_and_rbac_sidebar.md) | App Shell Navigation RBAC, Invalidate Cache đổi Showroom, Mobile/Tablet Sheet Drawer Hamburger Menu | ✅ Đã hoàn thành |
| **16** | [16_frontend_inventory_management.md](./16_frontend_inventory_management.md) | Phân hệ Kho Xe: VIN Real-time Masking (ISO 3779), CurrencyInput, UI-Level RBAC, Điều chuyển chi nhánh | ✅ Đã hoàn thành |
| **17** | [17_frontend_crm_and_leads_kanban.md](./17_frontend_crm_and_leads_kanban.md) | Phân hệ CRM & Leads: Interactive Drag & Drop Kanban 6 bước, Chống gian lận State Machine, useDebounce | ✅ Đã hoàn thành |
| **18** | [18_frontend_sales_orders_and_stepper.md](./18_frontend_sales_orders_and_stepper.md) | Phân hệ Bán Xe: Dependent Dropdown (Model -> VIN IN_STOCK), Order Stepper 4 bước, Modal hủy cọc nghiêm ngặt | ✅ Đã hoàn thành |
| **19** | [19_frontend_finance_invoices_and_payments.md](./19_frontend_finance_invoices_and_payments.md) | Phân hệ Tài Chính: Dynamic Zod Max (chống thu lố), Cross-Module Invalidation, Idempotency Mapping | ✅ Đã hoàn thành |
| **20** | [20_frontend_after_sales_service_management.md](./20_frontend_after_sales_service_management.md) | Phân hệ Xưởng Dịch Vụ: Odometer Guard, Dynamic useFieldArray (Auto-Append & Memo), Price Lock RBAC | ✅ Đã hoàn thành |

---

## 📌 Quy Chuẩn Đặt Tên & Lưu Kế Hoạch Mới

Khi khởi tạo kế hoạch cho các tính năng tiếp theo, tuân thủ nguyên tắc:
1. Đặt tên file theo cú pháp: `plan/{STT}_{ten_tinh_nang_viet_bang_tieng_anh_khong_dau}.md`.
2. Cấu trúc chuẩn của mỗi tài liệu plan bao gồm:
   - **Mục tiêu & Yêu cầu Kỹ thuật** (Objectives & Requirements)
   - **Cấu trúc Module FSD / Luồng Dữ Liệu** (Architecture & Data Flow)
   - **Chi tiết các bước triển khai cụ thể** (Implementation Steps)
   - **Kế hoạch kiểm thử & Đánh giá chất lượng** (Testing & Verification Plan)
3. Cập nhật liên kết tài liệu vào bảng tổng mục lục tại file [`plan/README.md`](./README.md).
