# 12. Thiết Kế Kiến Trúc Nền Tảng Frontend Next.js 15 (FSD & SSR Hydration)

Tài liệu này đặc tả kiến trúc tổng thể, hạ tầng công nghệ và cấu trúc thư mục của phân hệ **Frontend (`FE/`)** cho hệ thống Automotive Car ERP.

---

## 🎯 1. Mục Tiêu & Yêu Cầu Kỹ Thuật

1. **Framework & Công nghệ cốt lõi**:
   - **Next.js 15 (App Router)** + **React 19** + **TypeScript**.
   - UI & Styling: **Tailwind CSS v4** + **Shadcn UI** (Radix UI primitives) + **Framer Motion** cho micro-animations.
2. **Kiến trúc Feature-Sliced Design (FSD)**:
   - Phân tầng nghiêm ngặt: `app` -> `widgets` -> `features` -> `entities` -> `shared`.
   - Sử dụng `eslint-plugin-boundaries` để đảm bảo các feature không import chéo nhau.
3. **Data Fetching & Hydration**:
   - Tận dụng Server Components để fetch dữ liệu lần đầu (`prefetchQuery`).
   - Truyền dữ liệu vào TanStack Query qua `<HydrationBoundary state={dehydrate(queryClient)}>`.
4. **Quản trị trạng thái giao diện bền vững**:
   - Dùng **Zustand** kết hợp middleware `persist` cho `useUIStore` (Sidebar thu gọn, Theme Dark/Light, Active Showroom).

---

## 🏛️ 2. Cấu Trúc Thư Mục Chuẩn FSD

```
FE/
├── src/
│   ├── app/                      # App Router: Layouts, Server Components, Providers
│   │   ├── (auth)/login/         # Màn hình đăng nhập
│   │   ├── (dashboard)/          # Shell Layout (AppSidebar + AppHeader)
│   │   │   ├── page.tsx          # Executive Dashboard
│   │   │   ├── inventory/        # Kho xe & Danh mục Model xe
│   │   │   ├── crm/              # Khách hàng & Phễu Leads
│   │   │   ├── sales/            # Hợp đồng Bán xe & State Machine
│   │   │   ├── service/          # Xưởng dịch vụ & Bảo dưỡng xe
│   │   │   ├── finance/          # Hóa đơn & Sổ cái dòng tiền
│   │   │   └── settings/         # Cài đặt chi nhánh & Tài khoản
│   │   ├── layout.tsx            # Root Layout
│   │   ├── error.tsx             # Global Error Boundary
│   │   └── not-found.tsx         # 404 Custom Page
│   ├── widgets/                  # Header, Sidebar, DataTable, KPICards
│   ├── features/                 # Forms & Modals tương tác nghiệp vụ
│   ├── entities/                 # Types khớp sqlc Go + React Query Hooks
│   └── shared/                   # Axios client, UI Primitives, Stores, Utils
```

---

## ⚡ 3. Các Bước Triển Khai

1. **Khởi tạo & Cài đặt Dependencies**:
   - Cài đặt Next.js 15, React 19, TypeScript, Tailwind CSS, Lucide icons, Framer motion.
   - Cài đặt `@tanstack/react-query`, `@tanstack/react-table`, `axios`, `zustand`, `date-fns`, `isomorphic-dompurify`.
2. **Cấu hình TypeScript & ESLint Strict**:
   - Cấu hình FSD path aliases trong `tsconfig.json` (`@/app/*`, `@/widgets/*`, `@/features/*`, `@/entities/*`, `@/shared/*`).
   - Cấu hình `eslint-plugin-boundaries` v7 để chặn vi phạm FSD.
3. **Xây dựng Tầng Shared & UI Components**:
   - Cấu hình CSS Variables và Design Tokens trong `src/app/globals.css`.
   - Xây dựng các UI Components: `Button`, `Input`, `Badge`, `Card`, `Dialog`, `Select`, `Table`, `Tabs`, `Skeleton`, `Avatar`.
4. **Triển khai QueryClient Singleton**:
   - Tạo hàm `getQueryClient()` tối ưu cho cả Server & Client.

---

## 🧪 4. Kế Hoạch Kiểm Thử

- `npx eslint`: Đạt 0 lỗi, 0 cảnh báo về FSD boundaries.
- `npm run build`: Biên dịch thành công 100% các routes.
