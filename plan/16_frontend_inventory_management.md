# 16. Kế Hoạch Chi Tiết: Phân Hệ Quản Lý Kho Xe & Danh Mục Mẫu Xe (Inventory)

Tài liệu này đặc tả chi tiết kế hoạch thiết kế và triển khai phân hệ **Inventory (Kho Xe & Danh Mục Mẫu Xe)** trên giao diện Frontend Next.js 15 kết nối Backend Go, tuân thủ các quy chuẩn automotive toàn cầu và kiến trúc FSD.

---

## 🎯 1. Mục Tiêu & Yêu Cầu Kỹ Thuật

1. **Quản Lý Danh Mục Mẫu Xe (`Vehicle Models`)**:
   - Quản lý danh mục: Hãng sản xuất (`make`), Tên model (`model`), Năm sản xuất (`year`), Phiên bản (`trim`).
   - Modal `CreateModelModal` cho phép thêm mới model với validation Zod.
2. **Quản Lý Kho Xe Vật Lý Theo Số Khung VIN (`Vehicles`)**:
   - Theo dõi từng xe thực tế: Số khung VIN (17 ký tự), Số máy (Engine No.), Màu ngoại/nội thất, Giá nhập từ hãng (Decimal format VND), Showroom chi nhánh trực thuộc.
   - Quản lý 5 trạng thái vòng đời xe: `IN_STOCK`, `RESERVED`, `SOLD`, `MAINTENANCE`, `IN_TRANSIT`.
3. **Quy Chuẩn Quốc Tế Cho Số VIN (ISO 3779) & Real-Time Masking**:
   - Bắt buộc đúng **17 ký tự chữ và số in hoa**.
   - **Tuyệt đối cấm các ký tự `I`, `O`, `Q`** (nhằm chống nhầm lẫn với số `1` và `0` theo quy chuẩn automotive toàn cầu).
   - Tự động can thiệp vào sự kiện gõ phím (`onChange`), tự động viết hoa `.toUpperCase()` và loại bỏ ngay lập tức các ký tự cấm.
   - Regex Zod validation: `/^[A-HJ-NPR-Z0-9]{17}$/`.
4. **Component Định Dạng Tiền Tệ `CurrencyInput`**:
   - Tự động format hiển thị dấu phẩy phân cách hàng nghìn (ví dụ: `1,250,000,000 ₫`) khi nhập giá trị tài sản lớn.
   - Trả về chuỗi số nguyên thô (`1250000000`) an toàn cho form và API Backend.
5. **Phân Quyền Thao Tác UI-Level RBAC**:
   - Nút "Nhập Xe Mới", "Thêm Mẫu Xe Mới", "Chuyển chi nhánh": Chỉ hiển thị cho `superadmin` và `branch_manager` (ẩn hoàn toàn với `mechanic` và `salesperson`).
   - Nút "Đổi trạng thái": Hiển thị cho `superadmin`, `branch_manager`, `mechanic`.
6. **Điều Chuyển Kho Xe Giữa Các Showroom (`Transfer Vehicle`)**:
   - Tự động chặn điều chuyển nếu xe đang ở trạng thái `RESERVED` (đã cọc) hoặc `SOLD` (đã bán).
7. **Thanh Thống Kê KPI Tồn Kho (Inventory Summary Bar)**:
   - Tổng số xe trong kho, Tổng giá trị tồn kho (VND Decimal), Số xe `IN_STOCK`, Số xe `RESERVED`, Số xe `MAINTENANCE`.
8. **Bộ Lọc Nhanh Trạng Thái (Status Filter Pills)**:
   - Lọc 1-click giữa các trạng thái `Tất Cả`, `Sẵn Sàng Bán (IN_STOCK)`, `Đã Đặt Cọc (RESERVED)`, `Bảo Dưỡng (MAINTENANCE)`, `Đã Giao (SOLD)`.

---

## 🏛️ 2. Cấu Trúc Module Theo Chuẩn FSD

```
FE/src/
├── shared/components/ui/
│   └── currency-input.tsx        # Component CurrencyInput tự động format dấu phẩy hàng nghìn
├── entities/vehicle/
│   ├── types.ts                  # Khai báo interfaces khớp 100% Go sqlc models
│   ├── api.ts                    # Endpoints (/vehicles, /vehicles/models, /transfer, /status)
│   ├── queries.ts                # TanStack Query hooks (useVehicles, useVehicleModels...)
│   └── index.ts
├── features/inventory/
│   ├── create-vehicle-modal.tsx  # Modal nhập xe (Zod ISO 3779 + VIN Masking + CurrencyInput)
│   ├── create-model-modal.tsx    # Modal tạo dòng xe mới
│   └── transfer-vehicle-modal.tsx# Modal điều chuyển showroom (chặn RESERVED/SOLD)
└── app/(dashboard)/inventory/
    ├── page.tsx                  # Server Component Prefetching + HydrationBoundary
    └── inventory-view.tsx        # Client View: Inventory KPI Bar, Status Filter, 2 Tabs
```

---

## 🧪 3. Kế Hoạch Kiểm Thử

- `npx eslint`: 0 errors, 0 warnings.
- `npm run build`: Biên dịch thành công 100% các routes.
- Nhập số VIN chứa `i`, `o`, `q` -> Ký tự bị chặn ngay lập tức.
- Nhập giá tiền `1050000000` -> Hiển thị format `1,050,000,000 ₫`.
