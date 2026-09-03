# 🏎️ Automotive Car ERP - Hệ Thống Quản Trị Doanh Nghiệp Ô Tô Đa Chi Nhánh

[![Go Version](https://img.shields.io/badge/Go-1.23+-00ADD8?style=flat&logo=go)](https://golang.org)
[![Next.js Version](https://img.shields.io/badge/Next.js-15%2F16-black?style=flat&logo=next.js)](https://nextjs.org)
[![React Version](https://img.shields.io/badge/React-19-61DAFB?style=flat&logo=react)](https://react.dev)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16+-336791?style=flat&logo=postgresql)](https://www.postgresql.org)
[![Tailwind CSS](https://img.shields.io/badge/TailwindCSS-v4-38B2AC?style=flat&logo=tailwind-css)](https://tailwindcss.com)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-3178C6?style=flat&logo=typescript)](https://www.typescriptlang.org)
[![Architecture](https://img.shields.io/badge/Architecture-FSD%20%2B%20RLS-blueviolet)](#-kiến-trúc-hệ-thống)

---

## 📖 Giới Thiệu Dự Án (Project Overview)

**Automotive Car ERP** là giải pháp phần mềm hoạch định tài nguyên doanh nghiệp (Enterprise Resource Planning) toàn diện được thiết kế đặc thù cho các chuỗi đại lý, showroom và xưởng dịch vụ ô tô quy mô lớn. 

Hệ thống cung cấp quy trình kinh doanh khép kín từ khâu tiếp cận khách hàng tiềm năng (CRM), quản lý kho xe theo số khung VIN định danh duy nhất, lên đơn đặt hàng - cọc xe, quản lý dòng tiền tài chính đa phương thức đến dịch vụ bảo dưỡng, sửa chữa và quản lý phụ tùng xưởng sau bán hàng.

### 🌟 Điểm Nổi Bật Kỹ Thuật (Key Highlights)
- **Kiến trúc Đa Chi Nhánh (Multi-Tenant Isolation)**: Cách ly dữ liệu hoàn toàn giữa các chi nhánh bằng **PostgreSQL Row-Level Security (RLS)** ở tầng cơ sở dữ liệu.
- **Khóa Bi Quan (Pessimistic Locking)**: Chống bán trùng xe (`Race Condition`) với `SELECT ... FOR UPDATE` khi tạo đơn hàng hoặc điều chuyển kho.
- **Tính Toán Tài Chính Chuẩn Xác**: Xử lý tiền tệ bất biến sai số bằng `shopspring/decimal` (Go) và `pgtype.Numeric` (Postgres).
- **Quy Trình Nghiệp Vụ Bất Biến (Finite State Machines)**: Kiểm soát nghiêm ngặt chuyển đổi trạng thái xe, cơ hội bán hàng, đơn đặt hàng và lệnh sửa chữa.
- **Giao Diện Doanh Nghiệp Chuẩn FSD (Feature-Sliced Design)**: Tối ưu hoá Server-Side Rendering (SSR) với Next.js App Router, TanStack Query Server Prefetching + Hydration, kết hợp Tailwind CSS & Radix UI.
- **Giám Sát & Truy Vết Toàn Diện (Observability)**: Tích hợp Structured Logger (`log/slog` JSON) và Sentry APM xuyên suốt cả Frontend lẫn Backend.

---

## 🏛️ Kiến Trúc Hệ Thống (System Architecture)

```
                                  ┌─────────────────────────────────────────┐
                                  │      CLIENT BROWSER / MOBILE WEB        │
                                  └────────────────────┬────────────────────┘
                                                       │
                                              HTTP / REST API (JWT)
                                                       │
                                                       ▼
 ┌──────────────────────────────────────────────────────────────────────────────────────────────────┐
 │                                   FRONTEND (Next.js 15 / React 19)                               │
 │                                                                                                  │
 │  ┌─────────────────┐   ┌──────────────────┐   ┌─────────────────┐   ┌─────────────────────────┐  │
 │  │  App Router     │   │  Widgets         │   │  Features       │   │  Entities & Shared      │  │
 │  │  (SSR & Hydrate)│──▶│  (Sidebar, Table)│──▶│  (Kanban, Forms)│──▶│  (Zustand, React Query) │  │
 │  └─────────────────┘   └──────────────────┘   └─────────────────┘   └─────────────────────────┘  │
 └─────────────────────────────────────────────────────┬────────────────────────────────────────────┘
                                                       │
                                      Axios Client (Bearer Token / 401 Silent Refresh)
                                                       │
                                                       ▼
 ┌──────────────────────────────────────────────────────────────────────────────────────────────────┐
 │                                      BACKEND (Go + Gin Engine)                                   │
 │                                                                                                  │
 │  ┌─────────────────┐   ┌──────────────────┐   ┌─────────────────┐   ┌─────────────────────────┐  │
 │  │  Gin Router &   │   │  Auth & RBAC     │   │  Domain State   │   │  sqlc Store Layer       │  │
 │  │  Middlewares    │──▶│  (JWT / Session) │──▶│  Machines       │──▶│  (Type-safe Queries)    │  │
 │  └─────────────────┘   └──────────────────┘   └─────────────────┘   └─────────────────────────┘  │
 └─────────────────────────────────────────────────────┬────────────────────────────────────────────┘
                                                       │
                                         pgxpool (SET LOCAL app.current_*)
                                                       │
                                                       ▼
 ┌──────────────────────────────────────────────────────────────────────────────────────────────────┐
 │                                   DATABASE (PostgreSQL 16+)                                      │
 │                                                                                                  │
 │  ┌────────────────────────────────────────┐   ┌───────────────────────────────────────────────┐  │
 │  │  Row-Level Security (RLS) Policies     │   │  ACID Transactions & Pessimistic Locks        │  │
 │  └────────────────────────────────────────┘   └───────────────────────────────────────────────┘  │
 └──────────────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 🗂️ Cấu Trúc Thư Mục Dự Án (Project Layout)

```
car-erp/
├── .agents/                      # Hướng dẫn & Quy tắc dành cho AI / Developers
│   ├── AGENTS.md                 # Chỉ dẫn cốt lõi toàn dự án
│   └── rules/
│       ├── backend-specs.md      # Đặc tả API, Schema & State Machines Backend
│       └── frontend-standards.md # Quy chuẩn Next.js 15, FSD, TanStack Query
├── BE/                           # Phân hệ Backend (Go)
│   ├── cmd/server/               # Entrypoint HTTP Server & Graceful Shutdown
│   ├── db/
│   │   ├── migration/            # Migration SQL (Schema, RLS, Indexes)
│   │   ├── query/                # File SQL queries đầu vào cho sqlc
│   │   └── sqlc/                 # Mã nguồn Go type-safe sinh tự động
│   ├── internal/
│   │   ├── api/                  # Handlers, Router, Middlewares, Response DTOs
│   │   │   ├── handler/          # Auth, Branch, Customer, Lead, Order, Repair, Vehicle
│   │   │   └── middleware/       # JWT Auth, RBAC, Tenant Enforcement, CORS, Logger
│   │   ├── config/               # Load biến môi trường & validate
│   │   ├── database/             # PostgreSQL pgxpool connection & RLS session set
│   │   ├── domain/               # State Machines (Order, Service, Odometer)
│   │   ├── logger/               # Structured Logger slog JSON
│   │   ├── sentryutil/           # Tích hợp giám sát lỗi Sentry Go
│   │   ├── token/                # JWT Token Maker & Verifier
│   │   └── util/                 # Password Hash, Random generators
│   ├── Dockerfile
│   ├── go.mod
│   └── sqlc.yaml
├── FE/                           # Phân hệ Frontend (Next.js 15 + React 19)
│   ├── app/                      # Next.js App Router (Layouts, Pages, Sentry Pages)
│   │   ├── (auth)/               # Route nhóm đăng nhập & xác thực
│   │   └── (dashboard)/          # Route nhóm quản trị: CRM, Inventory, Sales, Service, Finance
│   ├── src/
│   │   ├── entities/             # FSD: Types, Query Options, Hooks (Khớp 100% BE models)
│   │   ├── features/             # FSD: Business Actions, Interactive Modals, Kanban Board
│   │   ├── widgets/              # FSD: AppSidebar, AppHeader, DataTable, KPICards
│   │   └── shared/               # FSD: Axios Client, Shadcn UI, Zustand Stores, Utilities
│   ├── Dockerfile
│   ├── package.json
│   ├── tsconfig.json
│   └── eslint.config.mjs
└── plan/                         # Toàn bộ 23+ tài liệu thiết kế & phân tích nghiệp vụ
```

---

## 🚀 Các Phân Hệ Nghiệp Vụ Cốt Lõi (Core Business Modules)

### 1. 🏢 Đa Chi Nhánh & Phân Quyền Bảo Mật (Multi-Tenant & RBAC)
- **PostgreSQL Row-Level Security (RLS)**: Tự động lọc dữ liệu chi nhánh tại tầng DB bằng session context `app.current_branch_id` và `app.current_user_role`.
- **Hệ Thống Phân Quyền (RBAC)**: `superadmin`, `branch_manager`, `salesperson`, `accountant`, `mechanic`.
- **Quản Lý Phiên & Silent Refresh**: Access Token 15 phút, Refresh Token 7 ngày với bảng quản lý phiên `sessions` cho phép thu hồi phiên tức thì.

### 2. 🚗 Quản Lý Kho Xe Vật Lý Theo Số VIN (Vehicle Inventory)
- **Định danh VIN chuẩn quốc tế**: Validate và mask số khung 17 ký tự (ISO 3779 standard).
- **Vòng đời trạng thái xe**: `IN_TRANSIT` ➔ `IN_STOCK` ➔ `RESERVED` ➔ `SOLD` | `MAINTENANCE`.
- **Điều Chuyển Chi Nhánh An Toàn**: Điều chuyển xe giữa các showroom trong một ACID Transaction nguyên tử, ghi log đầy đủ.

### 3. 👥 Quản Lý Khách Hàng & Phễu Bán Hàng CRM (CRM & Leads Pipeline)
- **Hồ Sơ Khách Hàng Thống Nhất**: Quản lý khách hàng cá nhân (`INDIVIDUAL`) và doanh nghiệp (`ENTERPRISE`) trên phạm vi toàn tập đoàn.
- **Kanban Pipeline Tương Tác**: Bảng Kanban 6 bước kéo thả (`Drag-and-Drop`):
  $$\text{NEW} \longrightarrow \text{CONTACTED} \longrightarrow \text{TEST\_DRIVE} \longrightarrow \text{QUOTED} \longrightarrow \text{WON} \;/\; \text{LOST}$$
- **Phân Bổ Lead Thông Minh**: Cấp quyền phân phối cơ hội bán hàng cho tư vấn viên kèm bộ lọc chi nhánh.

### 4. 📝 Quản Lý Đơn Đặt Hàng & Cọc Xe (Sales Orders)
- **Khóa Chống Tranh Chấp Xe (Pessimistic Lock)**: Khi khởi tạo đơn hàng, hệ thống tự động khóa bản ghi xe với `SELECT ... FOR UPDATE` và chuyển trạng thái xe sang `RESERVED`.
- **Quy Trình Đơn Hàng 4 Bước**:
  $$\text{DRAFT} \longrightarrow \text{DEPOSIT\_PAID} \longrightarrow \text{FULL\_PAID} \longrightarrow \text{DELIVERED}$$
- **Xử Lý Hủy Đơn & Quyết Toán Cọc**: 4 chính sách xử lý tiền cọc khi hủy đơn (`NONE`, `FORFEITED` - Tịch thu, `PENDING_REFUND` - Hoàn tiền, `CREDITED` - Ghi nhận công nợ) và tự động hoàn trả xe về trạng thái `IN_STOCK`.

### 5. 💰 Tài Chính, Hóa Đơn & Sổ Cái Dòng Tiền (Finance & Invoices)
- **Hóa Đơn Thu Tiền**: Hỗ trợ liên kết trực tiếp với Đơn bán xe (`sales_orders`) và Lệnh sửa chữa (`repair_orders`).
- **Thanh Toán Đa Kênh**: Ghi nhận thu tiền mặt (`CASH`), Chuyển khoản ngân hàng (`BANK_TRANSFER`), hoặc Trả góp ngân hàng (`INSTALLMENT`).
- **Chống Thu Lố (Overpayment Protection)**: Tự động ràng buộc dynamic validation không vượt quá số dư còn lại cần thanh toán.

### 6. 🔧 Xưởng Dịch Vụ & Bảo Dưỡng Sau Bán Hàng (After-Sales Service)
- **Lệnh Sửa Chữa (Repair Orders)**: Quản lý từ tiếp nhận xe đến nghiệm thu:
  $$\text{OPEN} \longrightarrow \text{IN\_PROGRESS} \longrightarrow \text{COMPLETED} \longrightarrow \text{INVOICED}$$
- **Cơ Chế Chống Tua Lùi ODO (Odometer Guard)**: Kiểm tra số ODO hiện tại với lịch sử trước đó; nếu phát hiện tua lùi bắt buộc phải có cờ `override_odometer` kèm lý do giải trình từ Branch Manager.
- **Quản Lý Vật Tư & Công Thợ**: Hỗ trợ thêm/sửa/xóa hạng mục phụ tùng (`PART`) và tiền công (`LABOR`) với tính toán tổng chi phí tự động.
- **Hồ Sơ Sức Khỏe Xe**: Tra cứu toàn bộ lịch sử bảo dưỡng và sửa chữa trọn đời theo từng số VIN.

---

## 🛠️ Ngăn Xếp Công Nghệ (Technology Stack)

### Backend (`BE/`)
| Công Nghệ | Phiên Bản | Mục Đích Sử Dụng |
|---|---|---|
| **Go** | 1.23+ | Ngôn ngữ backend hiệu năng cao, concurrency an toàn |
| **Gin Framework** | v1.10+ | HTTP Web Framework, routing nhanh, middleware pipeline |
| **PostgreSQL** | 16+ | Cơ sở dữ liệu quan hệ chính với Row-Level Security (RLS) |
| **pgx / pgxpool** | v5 | PostgreSQL driver & connection pool hiệu năng cao |
| **sqlc** | v1.27+ | Biên dịch SQL thuần thành code Go type-safe 100% |
| **shopspring/decimal** | v1.4+ | Tính toán số học tiền tệ độ chính xác tuyệt đối |
| **golang-jwt/jwt** | v5 | Tạo, ký và xác thực JSON Web Token |
| **slog** | Go standard | Structured Logging định dạng JSON chuẩn Cloud-Native |
| **Sentry Go** | v0.31+ | Giám sát ngoại lệ, APM tracing và error alerting |

### Frontend (`FE/`)
| Công Nghệ | Phiên Bản | Mục Đích Sử Dụng |
|---|---|---|
| **Next.js** | 15 / 16 (App Router) | Fullstack React Framework, SSR, Server Prefetching |
| **React** | 19 | Thư viện UI hiện đại |
| **TypeScript** | 5.0+ (Strict Mode) | Type safety, đồng bộ 100% models với backend |
| **Tailwind CSS** | v4 | Utility-first CSS framework |
| **Radix UI / Shadcn** | Mới nhất | Headless UI primitives dễ tuỳ biến, đạt chuẩn Accessibility |
| **TanStack Query** | v5 | Server state caching, background refetch, Hydration |
| **Zustand** | v5 | Quản lý client state (Theme, Sidebar) với `persist` |
| **Axios** | v1.7+ | HTTP Client với silent token renewal interceptor |
| **Framer Motion** | v13+ | Micro-animations và chuyển động mượt mà |
| **isomorphic-dompurify** | v3+ | Khử độc dữ liệu (XSS sanitization) |
| **Sentry Next.js** | v10+ | Báo cáo lỗi client/server/edge |

---

## 📦 Hướng Dẫn Cài Đặt & Chạy Hệ Thống (Getting Started)

### 📋 Điều Kiện Tiên Quyết (Prerequisites)
- [Go](https://go.dev/dl/) 1.23 trở lên
- [Node.js](https://nodejs.org/) 20.x hoặc 22.x LTS (kèm `npm` hoặc `pnpm`)
- [PostgreSQL](https://www.postgresql.org/) 15+ (đã bật tiện ích mở rộng `pgcrypto`)
- [golang-migrate](https://github.com/golang-migrate/migrate) (để chạy migration DB)
- [sqlc](https://sqlc.dev/) (nếu cần sinh lại mã truy vấn Go)

---

### 1️⃣ Thiết Lập Cơ Sở Dữ Liệu (Database Setup)

1. Tạo Database trên PostgreSQL:
   ```sql
   CREATE DATABASE erp_automotive;
   CREATE USER erp_admin WITH ENCRYPTED PASSWORD 'your_secure_password';
   GRANT ALL PRIVILEGES ON DATABASE erp_automotive TO erp_admin;
   ```

2. Chạy Migration để khởi tạo bảng và bật Row-Level Security:
   ```bash
   cd BE
   # Sử dụng migrate CLI
   migrate -path db/migration -database "postgresql://erp_admin:your_secure_password@localhost:5432/erp_automotive?sslmode=disable" up
   ```

---

### 2️⃣ Cấu Hình & Chạy Backend (`BE/`)

1. Sao chép và thiết lập biến môi trường:
   ```bash
   cd BE
   cp .env.example .env
   ```

2. Điền các thông số vào file `.env`:
   ```env
   APP_ENV=development
   SERVER_PORT=8080
   TOKEN_SYMMETRIC_KEY=12345678901234567890123456789012 # Tối thiểu 32 ký tự
   ACCESS_TOKEN_DURATION=15m
   REFRESH_TOKEN_DURATION=168h
   DB_URL=postgresql://erp_admin:your_secure_password@localhost:5432/erp_automotive?sslmode=disable
   CORS_ALLOWED_ORIGINS=http://localhost:3000,http://127.0.0.1:3000
   ```

3. Tải dependencies và khởi chạy Server:
   ```bash
   go mod download
   go run cmd/server/main.go
   ```
   > 🚀 Backend sẽ khởi chạy tại: `http://localhost:8080`  
   > 🩺 Kiểm tra Health Check: `http://localhost:8080/health`

---

### 3️⃣ Cấu Hình & Chạy Frontend (`FE/`)

1. Sao chép và cấu hình biến môi trường:
   ```bash
   cd FE
   cp .env.example .env.local
   ```

2. Cấu hình file `.env.local`:
   ```env
   NEXT_PUBLIC_API_URL=http://localhost:8080/api/v1
   ```

3. Cài đặt dependencies và khởi chạy Next.js dev server:
   ```bash
   npm install
   npm run dev
   ```
   > 🌐 Truy cập giao diện ứng dụng tại: `http://localhost:3000`

---

### 4️⃣ Khởi Chạy Bằng Docker (Docker Deployment)

Cả hai phân hệ đều đã sẵn sàng Dockerfile đa tầng (Multi-Stage Build) tối ưu dung lượng:

```bash
# Build & chạy Backend container
docker build -t car-erp-backend ./BE
docker run -d -p 8080:8080 --env-file ./BE/.env car-erp-backend

# Build & chạy Frontend container
docker build -t car-erp-frontend ./FE
docker run -d -p 3000:3000 --env-file ./FE/.env.local car-erp-frontend
```

---

## 📡 Danh Mục API Reference (REST Endpoints)

Mọi API response đều tuân thủ cấu trúc chuẩn:
```json
{
  "success": true,
  "data": { ... },
  "message": "Mô tả kết quả thực hiện",
  "error": null
}
```

| Nhóm Chức Năng | Phương Thức | Endpoint | Quyền Hạn (RBAC) | Mô Tả |
|---|---|---|---|---|
| **Health Check** | `GET` | `/health` | Public | Kiểm tra trạng thái server & pool DB |
| **Xác Thực** | `POST` | `/api/v1/auth/login` | Public | Đăng nhập hệ thống (nhận access & refresh token) |
| | `POST` | `/api/v1/auth/renew` | Public | Cấp lại access token qua refresh token |
| | `GET` | `/api/v1/auth/me` | Authenticated | Lấy thông tin tài khoản & chi nhánh hiện tại |
| | `POST` | `/api/v1/auth/logout` | Authenticated | Thu hồi phiên đăng nhập (`session_id`) |
| **Chi Nhánh** | `GET` | `/api/v1/branches` | Authenticated | Danh sách chi nhánh |
| | `POST` | `/api/v1/branches` | `superadmin` | Tạo chi nhánh showroom mới |
| **Dòng Xe** | `GET` | `/api/v1/vehicle-models` | Authenticated | Danh mục mẫu xe (Make, Model, Specs JSONB) |
| | `POST` | `/api/v1/vehicle-models` | `superadmin` | Thêm mẫu xe mới |
| **Kho Xe** | `GET` | `/api/v1/vehicles` | Authenticated (RLS) | Danh sách xe thực tế trong kho |
| | `GET` | `/api/v1/vehicles/vin/:vin` | Authenticated | Tra cứu chi tiết xe theo số VIN 17 ký tự |
| | `POST` | `/api/v1/vehicles` | `superadmin`, `branch_manager` | Nhập xe mới vào kho chi nhánh |
| | `POST` | `/api/v1/vehicles/:id/transfer` | `superadmin`, `branch_manager` | Điều chuyển xe sang chi nhánh khác |
| **CRM Khách Hàng** | `GET` | `/api/v1/customers` | Authenticated | Danh sách khách hàng (tìm kiếm theo số điện thoại, tên) |
| | `POST` | `/api/v1/customers` | Authenticated | Tạo hồ sơ khách hàng mới |
| **Leads Cơ Hội** | `GET` | `/api/v1/leads` | Authenticated (RLS) | Danh sách cơ hội bán hàng |
| | `POST` | `/api/v1/leads` | Authenticated | Tạo cơ hội bán hàng mới |
| | `PATCH` | `/api/v1/leads/:id/status` | Authenticated | Cập nhật tiến độ phễu bán hàng (Kanban) |
| | `PATCH` | `/api/v1/leads/:id/assign` | `branch_manager` | Phân công Sales phụ trách Lead |
| **Đơn Bán Xe** | `GET` | `/api/v1/sales-orders` | Authenticated (RLS) | Danh sách đơn đặt hàng xe |
| | `POST` | `/api/v1/sales-orders` | Authenticated | Lên đơn đặt hàng xe (Khóa xe bi quan) |
| | `PATCH` | `/api/v1/sales-orders/:id/status`| Authenticated | Đổi trạng thái đơn (Draft -> Deposit -> Full -> Delivered) |
| | `POST` | `/api/v1/sales-orders/:id/cancel`| Authenticated | Hủy đơn đặt hàng, quyết toán cọc & mở khóa xe |
| **Hóa Đơn & Tiền** | `GET` | `/api/v1/invoices` | Authenticated (RLS) | Danh sách hóa đơn |
| | `POST` | `/api/v1/invoices` | Authenticated | Xuất hóa đơn thu tiền |
| | `POST` | `/api/v1/invoices/:id/payments`| Authenticated | Ghi nhận thu tiền (CASH, BANK, INSTALLMENT) |
| | `GET` | `/api/v1/transactions` | Authenticated (RLS) | Sổ cái nhật ký dòng tiền thanh toán |
| **Xưởng Dịch Vụ** | `GET` | `/api/v1/repair-orders` | Authenticated (RLS) | Danh sách lệnh sửa chữa bảo dưỡng |
| | `POST` | `/api/v1/repair-orders` | Authenticated | Lập lệnh sửa chữa (Kiểm soát ODO chống tua lùi) |
| | `GET` | `/api/v1/repair-orders/vehicle/:id/history`| Authenticated | Lịch sử bảo dưỡng trọn đời của xe |
| | `POST` | `/api/v1/repair-orders/:id/items` | Authenticated | Thêm phụ tùng (`PART`) hoặc công thợ (`LABOR`) |
| | `DELETE`| `/api/v1/repair-orders/:id/items/:item_id` | Authenticated | Xóa phụ tùng / công thợ |
| | `POST` | `/api/v1/repair-orders/:id/invoice` | Authenticated | Xuất hóa đơn tài chính cho lệnh đã hoàn thành |

---

## 🧪 Kiểm Thử & Đảm Bảo Chất Lượng (Testing & QA)

### Kiểm Thử Backend (Go Unit & Integration Tests)
Backend có sẵn bộ test tích hợp toàn diện bao phủ RLS, Transaction, Concurrency & State Machine:
```bash
cd BE
# Chạy toàn bộ tests
go test -v ./...

# Chạy kiểm thử RLS Multi-Tenancy
go test -v ./db/sqlc -run TestRLS

# Chạy kiểm thử chống Race Condition Đơn Hàng
go test -v ./internal/api -run TestSalesOrderConcurrency
```

### Kiểm Thử Frontend (Linter & Type Check)
Tuân thủ nghiêm ngặt ranh giới kiến trúc FSD với ESLint boundaries:
```bash
cd FE
# Kiểm tra TypeScript
npm run build

# Kiểm tra ESLint & FSD Module Boundaries
npm run lint
```

---

## 🛡️ Nguyên Tắc An Toàn & Quy Chuẩn Lập Trình (Engineering Principles)

1. **Bất Biến Tài Chính**: Tuyệt đối không sử dụng `float32`/`float64` khi tính toán tiền tệ; chỉ sử dụng `shopspring/decimal` (Go) và `NUMERIC(15, 2)` (Postgres).
2. **Nguyên Tắc RLS**: Mọi câu lệnh SQL liên quan đến chi nhánh đều phải kích hoạt qua hàm `ExecWithTenant` hoặc set session context `app.current_branch_id`.
3. **Phân Định State Frontend**: 
   - Không lưu danh sách thực thể API (xe, khách hàng, hóa đơn) vào Zustand. 100% dữ liệu API phải quản lý qua TanStack Query.
   - Zustand chỉ dùng để lưu UI state cục bộ (Theme, collapsed sidebar).
4. **Kiến Trúc Ranh Giới FSD**: `features` không được import trực tiếp `features` khác. `entities` chỉ import từ `shared`.

---

## 👥 Đóng Góp & Tài Liệu Mở Rộng (Documentation)

- 📌 **Toàn bộ 23 bài phân tích & kế hoạch chi tiết**: Xem tại thư mục [`plan/README.md`](./plan/README.md).
- 📌 **Quy chuẩn Backend cho AI Agent & Dev**: Xem tại [`.agents/rules/backend-specs.md`](./.agents/rules/backend-specs.md).
- 📌 **Quy chuẩn Frontend cho AI Agent & Dev**: Xem tại [`.agents/rules/frontend-standards.md`](./.agents/rules/frontend-standards.md).

---

## 📄 Bản Quyền (License)

Dự án được phát triển dưới giấy phép nội bộ độc quyền của **Automotive Car ERP**. Mọi hành vi sao chép, phân phối lại nếu không có văn bản chấp thuận đều bị nghiêm cấm.
