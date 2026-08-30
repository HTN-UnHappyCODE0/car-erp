# 🤖 Car ERP - Quy Chuẩn Phát Triển Dành Cho AI Agents

Tài liệu này là chỉ dẫn cốt lõi (Ground Truth) dành cho mọi AI Agent khi tham gia khảo sát, phát triển tính năng, sửa lỗi hoặc tối ưu hóa trên toàn bộ hệ thống **Automotive Car ERP**.

---

## 🏛️ 1. Tổng Quan Kiến Trúc Hệ Thống (System Overview)

Hệ thống được chia thành 2 phân hệ độc lập:
1. **Backend (`BE/`)**:
   - Ngôn ngữ & Framework: **Go (Golang)** + **Gin Framework**.
   - Database: **PostgreSQL** có kích hoạt **Row-Level Security (RLS)** cho đa chi nhánh (Multi-Tenant).
   - Truy vấn & sinh mã: **sqlc** (`BE/db/sqlc`).
   - Xác thực: **JWT Auth** (Access Token 15 phút, Refresh Token 7 ngày) + Bảng quản lý phiên `sessions`.
   - Tính toán số học: `shopspring/decimal` (bất biến sai số tài chính).
2. **Frontend (`FE/`)**:
   - Framework: **Next.js 15 (App Router)** + **React 19** + **TypeScript**.
   - UI & Styling: **Tailwind CSS** + **Shadcn UI** (Radix UI primitives) + **Framer Motion** (micro-animations).
   - Kiến trúc thư mục: **Feature-Sliced Design (FSD)** kết hợp `eslint-plugin-boundaries`.
   - Data Fetching & Server State: **Server Components Prefetching** + **TanStack Query (React Query)** với `HydrationBoundary`.
   - Client UI State: **Zustand** kết hợp `persist` middleware (Lưu trữ Theme, Sidebar state). Tuyệt đối **KHÔNG** lưu API cache vào Zustand.
   - HTTP Client: **Axios** với Interceptors xử lý Silent Refresh Token (401) và phân quyền RBAC (403).

---

## 📂 2. Cấu Trúc Thư Mục Chuẩn (Project Layout)

```
car-erp/
├── .agents/                      # Hướng dẫn và quy tắc dành riêng cho AI Agents
│   ├── AGENTS.md                 # Tài liệu này
│   └── rules/
│       ├── frontend-standards.md # Quy chuẩn chi tiết Frontend Next.js 15 + React 19 + FSD
│       └── backend-specs.md      # Đặc tả kỹ thuật Backend Go + PostgreSQL RLS + State Machine
├── BE/                           # Phân hệ Backend Go
│   ├── cmd/server/               # Entrypoint HTTP Server
│   ├── db/
│   │   ├── migration/            # Migration SQL files (Up / Down)
│   │   ├── query/                # File SQL queries (.sql) đầu vào cho sqlc
│   │   └── sqlc/                 # Mã nguồn Go được sinh tự động bởi sqlc
│   └── internal/
│       ├── api/                  # Handlers, Middlewares, Response helpers
│       ├── config/               # Cấu hình biến môi trường
│       ├── database/             # PostgreSQL pgxpool connection
│       ├── domain/               # Business Rules, State Machines & Validations
│       ├── logger/               # Structured Logger (slog JSON)
│       └── token/                # JWT Maker & Token Verifier
├── FE/                           # Phân hệ Frontend Next.js 15
│   ├── app/                      # Next.js App Router (Routes, Nested Layouts, Server Components)
│   ├── src/
│   │   ├── entities/             # FSD: Business Entities (Types khớp sqlc Go + Query Hooks)
│   │   ├── features/             # FSD: User Actions, Interactive Forms & Modals
│   │   ├── widgets/              # FSD: AppSidebar, AppHeader, DataTable, KPICards
│   │   └── shared/               # FSD: Axios Client, Shadcn UI, Zustand Stores, Libs
│   ├── package.json
│   ├── tsconfig.json
│   └── eslint.config.mjs
└── plan/                         # Toàn bộ kế hoạch và tài liệu phân tích nghiệp vụ
```

---

## ⚡ 3. Các Quy Tắc Bắt Buộc (Mandatory Rules for AI)

### A. Quy tắc Backend (Go)
1. **Multi-Tenancy & RLS**: Luôn truyền ngữ cảnh `app.current_branch_id` và `app.current_user_role` vào Postgres Session khi thực thi câu truy vấn liên quan đến chi nhánh.
2. **Khóa chống Race Condition**: Đối với kho xe (`vehicles`) và đơn hàng (`sales_orders`), luôn dùng `SELECT ... FOR UPDATE` (Pessimistic Lock) trong `ExecTx`.
3. **State Machine Bất Biến**: Không cập nhật tùy tiện trạng thái xe hay đơn hàng; phải thông qua hàm kiểm tra `domain.ValidateOrderTransition` hoặc `domain.ValidateServiceTransition`.
4. **Xử lý số tiền**: Không dùng `float64` cho tiền tệ. Bắt buộc dùng `pgtype.Numeric` và `shopspring/decimal`.

### B. Quy tắc Frontend (Next.js 15)
1. **Server vs Client Components**:
   - Sử dụng Server Components cho các Layouts, Pages để fetch dữ liệu lần đầu (`prefetchQuery`).
   - Sử dụng `<HydrationBoundary state={dehydrate(queryClient)}>` để truyền state xuống Client Components.
   - Chỉ gắn `'use client'` khi component có tương tác (`useState`, `useEffect`, `onClick`, Form inputs).
2. **FSD Boundaries**:
   - `app` có thể import từ `widgets`, `features`, `entities`, `shared`.
   - `widgets` có thể import từ `features`, `entities`, `shared`.
   - `features` có thể import từ `entities`, `shared`. **Cấm Feature này import trực tiếp Feature khác**.
   - `entities` chỉ import từ `shared`.
   - `shared` không được import từ bất kỳ layer nào ở trên.
3. **Zustand vs React Query**:
   - **Zustand (useUIStore)**: Chỉ quản lý trạng thái giao diện nội bộ (Sidebar thu gọn, Theme dark/light) với `persist` middleware.
   - **TanStack Query**: Quản lý 100% dữ liệu API trả về, caching, pagination, background refetch.
4. **TypeScript Strictness**:
   - 100% interfaces tại `src/entities/*/types.ts` phải khớp chính xác với `BE/db/sqlc/models.go`.
   - Không sử dụng `any`.
5. **Bảo Mật & Sanitization**:
   - Sử dụng `DOMPurify` (`isomorphic-dompurify`) khi hiển thị text người dùng nhập có định dạng.
   - Token được tự động gắn qua Axios Interceptor và làm mới qua endpoint `/api/v1/auth/renew`.

---

## 📚 4. Tài Liệu Tham Chiếu Chi Tiết

- Xem chi tiết tiêu chuẩn Frontend tại: [.agents/rules/frontend-standards.md](file:///d:/project/bad-idea/car-erp/.agents/rules/frontend-standards.md)
- Xem chi tiết đặc tả Backend tại: [.agents/rules/backend-specs.md](file:///d:/project/bad-idea/car-erp/.agents/rules/backend-specs.md)
