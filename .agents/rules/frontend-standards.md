# 🎨 Quy Chuẩn Phát Triển Frontend Car ERP (Frontend Standards)

Tài liệu này quy định chi tiết về ngăn xếp công nghệ, kiến trúc, quy tắc viết mã và ranh giới module của phân hệ **Frontend (`FE/`)**. Mọi AI Agent và lập trình viên phải tuân thủ nghiêm ngặt.

---

## 1. Ngăn Xếp Công Nghệ Bắt Buộc (Tech Stack)

- **Framework**: Next.js 15 (App Router).
- **Core Library**: React 19.
- **Ngôn ngữ**: TypeScript (Strict Mode).
- **Styling**: Tailwind CSS v3/v4 + CSS Variables (Dark/Light mode palette).
- **UI Components**: Shadcn UI (sử dụng Radix UI primitives: Dialog, Select, Dropdown, Tabs, Tooltip, Avatar).
- **Animation**: Framer Motion (micro-animations, transitions cho modals, stats cards, lists).
- **Quản lý Server State (API Data)**: TanStack Query v5 (`@tanstack/react-query`) kết hợp Server Components Prefetching + `<HydrationBoundary>`.
- **Quản lý Client State**: Zustand với `persist` middleware (chỉ quản lý Theme, trạng thái đóng/mở Sidebar, UI flags).
- **HTTP Client**: Axios với Interceptors (xử lý gắn Bearer Token, 401 Silent Token Renewal, 403 Forbidden).
- **Bảo mật XSS & Sanitization**: `isomorphic-dompurify`.
- **Định dạng số liệu & ngày tháng**: `date-fns`, format VND tiền tệ, format số VIN chuẩn 17 ký tự.

---

## 2. Kiến Trúc Feature-Sliced Design (FSD)

Cấu trúc thư mục trong `FE/src/` được phân cấp chặt chẽ từ trên xuống dưới:

```
src/
├── app/         # Routing, Next.js Pages, Global Layouts & Providers
├── widgets/     # Khối UI phức hợp (AppSidebar, AppHeader, DataTable, KPICards)
├── features/    # Tương tác người dùng & Modals (LoginForm, CreateVehicleModal, CancelOrderDialog,...)
├── entities/    # Thực thể nghiệp vụ (Types khớp sqlc Go, API services, Query Hooks)
└── shared/      # Hạ tầng dùng chung (Axios Client, Shadcn UI primitives, Libs, Zustand Stores)
```

### Quy Tắc Ranh Giới Module (Module Boundaries)
Tuân theo ma trận `eslint-plugin-boundaries`:
1. **Layer Dependency Hierarchy**:
   - `app` ➔ `widgets`, `features`, `entities`, `shared`
   - `widgets` ➔ `features`, `entities`, `shared`
   - `features` ➔ `entities`, `shared`
   - `entities` ➔ `shared`
   - `shared` ➔ KHÔNG được import từ layer nào bên trên
2. **Cấm Cross-Imports ngang hàng trong Features & Entities**:
   - `features/sales` **KHÔNG ĐƯỢC** import trực tiếp từ `features/inventory`. Nếu cần chia sẻ, hãy đưa logic/modal đó vào `entities` hoặc `widgets`.
   - `entities/vehicle` **KHÔNG ĐƯỢC** import trực tiếp từ `entities/customer`.

---

## 3. Quy Chuẩn Data Fetching & Hydration

1. **Server-Side Prefetching trong Server Components**:
   ```tsx
   // app/(dashboard)/inventory/page.tsx (Server Component)
   import { dehydrate, HydrationBoundary } from '@tanstack/react-query';
   import { getQueryClient } from '@/shared/api/get-query-client';
   import { vehicleQueries } from '@/entities/vehicle';
   import { InventoryView } from '@/widgets/inventory-view';

   export default async function InventoryPage() {
     const queryClient = getQueryClient();
     await queryClient.prefetchQuery(vehicleQueries.list({ page: 1, pageSize: 10 }));

     return (
       <HydrationBoundary state={dehydrate(queryClient)}>
         <InventoryView />
       </HydrationBoundary>
     );
   }
   ```
2. **Client Components tiếp quản dữ liệu**:
   ```tsx
   'use client';
   import { useVehicles } from '@/entities/vehicle';

   export function InventoryView() {
     const { data, isLoading } = useVehicles({ page: 1, pageSize: 10 });
     // Dữ liệu có ngay lập tức từ Hydration cache, không bị giật trắng màn hình!
   }
   ```

---

## 4. Quy Chuẩn Quản Trị Trạng Thái (State Management)

1. **Zustand (useUIStore)**:
   - Chỉ dùng để lưu trạng thái giao diện nội bộ của trình duyệt.
   - Bắt buộc bọc bằng `persist` middleware để lưu vào `localStorage`.
   - Tránh hiện tượng Hydration mismatch bằng cách kiểm tra `hasHydrated`.
   ```ts
   // src/shared/store/ui-store.ts
   export const useUIStore = create<UIState>()(
     persist(
       (set) => ({
         sidebarCollapsed: false,
         theme: 'dark',
         toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
         setTheme: (theme) => set({ theme }),
       }),
       { name: 'car-erp-ui-storage' }
     )
   );
   ```
2. **Tuyệt đối cấm**:
   - Lưu trữ danh sách xe, danh sách hóa đơn, danh sách khách hàng vào Zustand. Dữ liệu này phải do TanStack Query quản lý.

---

## 5. Quy Chuẩn Bảo Mật & Xác Thực

1. **Token Lifecycle**:
   - Access Token được lưu trong `useAuthStore` (in-memory) hoặc HttpOnly Cookies.
   - Khi request gửi đi bị trả về lỗi `401 Unauthorized`:
     - Axios Interceptor sẽ tự động giữ lại (queue) request và gọi `/api/v1/auth/renew` với `refresh_token`.
     - Nếu cấp lại thành công: Gán token mới và tự động thực thi lại các request bị pending.
     - Nếu Refresh Token hết hạn: Xóa phiên và chuyển hướng người dùng về `/login`.
2. **Sanitization**:
   - Mọi ghi chú thợ sửa xe, triệu chứng bệnh của xe hoặc mô tả kỹ thuật nếu hiển thị dạng HTML phải được bọc qua:
     ```tsx
     import DOMPurify from 'isomorphic-dompurify';
     <div dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(notes) }} />
     ```

---

## 6. Trải Nghiệm Người Dùng (UX) & Hiệu Năng

1. **Skeleton Loaders**: Luôn cung cấp Skeleton dạng bảng / thẻ card trong trạng thái `isLoading` thay vì Spinner xoay đơn điệu.
2. **Error Boundaries**: Mọi trang chính đều có `error.tsx` để cô lập lỗi phát sinh, đảm bảo không làm sập toàn bộ ứng dụng ERP.
3. **Framer Motion**: Áp dụng hiệu ứng fade-in mượt mà (`opacity: 0 -> 1, y: 10 -> 0`) khi chuyển trang hoặc mở Dialog.
