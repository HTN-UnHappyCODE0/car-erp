# 15. Thiết Kế App Shell Navigation RBAC, Branch Invalidation & Mobile/Tablet Sheet Drawer

Tài liệu này đặc tả chi tiết kiến trúc điều hướng phân quyền động (Dynamic RBAC Navigation), cấu trúc Widget `AppSidebar` (Desktop & Mobile Drawer), `AppHeader` (Dynamic Breadcrumbs, Invalidate Cache Showroom, Theme Switcher & Logout) và Master Layout của hệ thống Automotive Car ERP.

---

## 🎯 1. Mục Tiêu & Yêu Cầu Kỹ Thuật

1. **Ma Trận Phân Quyền Navigation (`allowedRoles`)**:
   - Khai báo tập trung tại `FE/src/shared/config/navigation.ts`.
   - Mỗi menu liên kết chặt chẽ với danh sách vai trò người dùng được phép truy cập (`superadmin`, `branch_manager`, `salesperson`, `mechanic`, `accountant`).
2. **Đồng Bộ Dữ Liệu Khi Đổi Chi Nhánh (Branch Invalidation)**:
   - Trong `AppHeader`, khi Quản lý chuyển đổi Showroom, ngoài việc cập nhật `activeBranchId` trong Zustand, hệ thống gọi `queryClient.clear()` và `queryClient.invalidateQueries()` để xóa toàn bộ cache cũ và ép toàn bộ ứng dụng refetch dữ liệu theo ngữ cảnh chi nhánh mới.
3. **Trải Nghiệm Responsive Trên Tablet & Mobile Cho Kỹ Thuật Viên**:
   - Sử dụng component `Sheet` (Shadcn UI Drawer) trượt từ cạnh trái (`side="left"`).
   - Trên màn hình `< 1024px` (iPad, Tablet xưởng dịch vụ), thanh Sidebar cố định được ẩn đi để nhường toàn bộ diện tích cho bảng dữ liệu ODO và phụ tùng; kỹ thuật viên mở menu qua nút Hamburger trên Header.
4. **Dynamic Breadcrumbs & Theme Switcher**:
   - Tự động nhận diện đường dẫn hiện tại và phân cấp Breadcrumb tiếng Việt.
   - Chuyển đổi Dark/Light mode và Đăng xuất phiên làm việc (xóa sạch Cookie & Zustand session).

---

## 🏛️ 2. Cấu Trúc Thành Phần

```
FE/src/
├── shared/
│   ├── config/
│   │   └── navigation.ts         # Ma trận cấu hình Menu Động & allowedRoles
│   └── components/ui/
│       └── sheet.tsx             # Radix Dialog Drawer (side: left/right/top/bottom)
├── widgets/
│   ├── app-sidebar/
│   │   └── app-sidebar.tsx       # Desktop Collapsible Sidebar & SidebarNavContent
│   └── app-header/
│       └── app-header.tsx        # Header: Hamburger Sheet, Branch Switcher, Breadcrumbs, Theme, Logout
└── app/
    └── (dashboard)/
        └── layout.tsx            # Master Layout bọc AppSidebar, AppHeader & ErrorBoundary
```

---

## ⚡ 3. Ma Trận Phân Quyền Chi Tiết

| Route | Tên Hiển Thị | Quyền Được Phép (`allowedRoles`) |
|:---|:---|:---|
| `/` | Tổng Quan | `superadmin`, `branch_manager`, `salesperson`, `mechanic`, `accountant` |
| `/inventory` | Kho Xe & Mẫu Xe | `superadmin`, `branch_manager`, `salesperson`, `mechanic` |
| `/crm` | Khách Hàng & Leads | `superadmin`, `branch_manager`, `salesperson` |
| `/sales` | Hợp Đồng Bán Xe | `superadmin`, `branch_manager`, `salesperson` |
| `/service` | Xưởng Dịch Vụ | `superadmin`, `branch_manager`, `mechanic` |
| `/finance` | Tài Chính & Dòng Tiền | `superadmin`, `branch_manager`, `accountant` |
| `/settings` | Cài Đặt Chi Nhánh | `superadmin`, `branch_manager` |

---

## 🧪 4. Kết Quả Kiểm Thử

- `npx eslint`: **0 errors, 0 warnings**.
- `npm run build`: Biên dịch thành công 100% 11 route với Proxy Middleware.
