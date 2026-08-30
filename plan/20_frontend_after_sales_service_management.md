# 20. Kế Hoạch Chi Tiết: Phân Hệ Quản Lý Xưởng Dịch Vụ, Odometer Guard & Form Động (/service)

Tài liệu này đặc tả chi tiết kế hoạch thiết kế và triển khai phân hệ **Service (Xưởng Dịch Vụ & Hậu Mãi)** trên giao diện Frontend Next.js 15 kết nối Backend Go, ứng dụng Odometer Guard chống tua lùi ODO, Dynamic useFieldArray với Auto-Append & React.memo tối ưu hiệu năng 70+ dòng phụ tùng, Field-Level RBAC khóa giá với thợ máy và Vehicle History Drawer tra cứu toàn diện.

---

## 🎯 1. Mục Tiêu & Yêu Cầu Kỹ Thuật

1. **Tiếp Nhận Xe & Lập Phiếu Dịch Vụ (`Repair Orders`)**:
   - Ghi nhận thông tin xe vào xưởng: Khách hàng, Xe (VIN), Cố vấn dịch vụ / Kỹ thuật viên phụ trách, Hiện trạng & Triệu chứng hư hỏng, **Số Kilomet hiện tại (`odometer`)**.
   - State Machine 4 bước chuẩn xưởng dịch vụ:
     $$\text{OPEN (Tiếp Nhận)} \longrightarrow \text{IN\_PROGRESS (Đang Sửa Chữa)} \longrightarrow \text{COMPLETED (Nghiệm Thu Xong)} \longrightarrow \text{INVOICED (Đã Xuất Hóa Đơn)}$$
2. **Odometer Guard (Chống Tua Công-tơ-mét & Manager Override)**:
   - Tự động tra cứu số ODO cao nhất của xe ở các lần sửa chữa trước (`lastOdometer`).
   - Nếu `odometer < lastOdometer`:
     - Báo lỗi đỏ rực ở tầng Zod validation: *"Số KM hiện tại ({current} km) nhỏ hơn lần sửa chữa trước ({last} km). Cảnh báo tua lùi ODO!"*
     - **Manager Override Mechanism**: Nếu thực sự lần trước nhập nhầm hoặc xe thay đồng hồ taplo mới, tài khoản có quyền Quản lý (`branch_manager` / `superadmin`) có thể tích chọn mở khóa kèm lý do giải trình bắt buộc (`override_reason`).
3. **Trải Nghiệm Nhập Liệu Tốc Độ Cao & Auto-Append Row**:
   - Khi dòng cuối cùng được điền xong hoặc bấm Enter, tự động gọi `append()` dòng trống mới, hỗ trợ nhập liệu siêu tốc như Excel cho Cố vấn & Kỹ thuật viên.
4. **Phân Quyền Sửa Đơn Giá Từng Dòng (Price Lock RBAC - Field-Level)**:
   - Kiểm tra `user.role` từ `useAuthStore`: Nếu là `mechanic`, ô `unit_price` sẽ bị `disabled/readOnly`. Chỉ có `service_advisor`, `branch_manager`, `superadmin` mới có quyền chỉnh sửa đơn giá hoặc chiết khấu.
5. **Tối Ưu Hiệu Suất Re-render (React.memo Sub-Components)**:
   - Tách từng dòng vật tư trong `useFieldArray` thành component con `RepairItemRow` bọc bằng `React.memo`, chống giật lag typing latency khi danh sách đạt 50-70 hạng mục đại tu động cơ.
6. **Sổ Lịch Sử Sửa Chữa Xe (`Vehicle History Drawer`)**:
   - Drawer tra cứu nhanh toàn bộ lịch sử các lần bảo dưỡng, thay thế phụ tùng trước đây của chiếc xe theo số VIN để tư vấn chính xác cấp bảo dưỡng định kỳ.
7. **Nghiệm Thu Hoàn Tất & Tự Động Xuất Hóa Đơn Kế Toán (Cross-Module Finance Sync)**:
   - Khi nghiệm thu xong (`COMPLETED`), Cố vấn dịch vụ xuất hóa đơn -> Tự động sinh `Invoice` trong phân hệ Kế toán (`/finance`) và kích hoạt Cache Invalidation đồng bộ thời gian thực.
8. **Thanh Thống Kê Xưởng Dịch Vụ & Bộ Lọc Nhanh (Service KPI Bar & Filter Pills)**:
   - Thống kê: Tổng số xe trong xưởng, Xe mới tiếp nhận (`OPEN`), Xe đang sửa (`IN_PROGRESS`), Xe nghiệm thu xong (`COMPLETED`), Đã xuất hóa đơn (`INVOICED`), Doanh thu xưởng dịch vụ.

---

## 🏛️ 2. Cấu Trúc Module Theo Chuẩn FSD

```
FE/src/
├── entities/repair-order/        # Types, API, Queries (useRepairOrders, useCreateRepairOrder, useVehicleRepairHistory)
├── features/service/
│   ├── vehicle-history-drawer.tsx # Drawer tra cứu toàn bộ lịch sử bảo dưỡng theo số VIN
│   ├── repair-item-row.tsx       # Component con React.memo tối ưu render từng dòng phụ tùng/công
│   ├── create-repair-modal.tsx    # Modal tiếp nhận xe + Odometer Guard + Dynamic useFieldArray
│   ├── add-item-dialog.tsx        # Dialog bổ sung vật tư / công thợ khi đang sửa chữa
│   └── repair-order-detail-dialog.tsx # Dialog xem chi tiết phiếu, hạng mục và chuyển bước tiến độ
└── app/(dashboard)/service/
    ├── page.tsx                  # Server Component Prefetching (Repair Orders, Customers, Vehicles)
    └── service-view.tsx          # Service KPI Bar, Status Filter, Order Stepper & DataTable
```

---

## 🧪 3. Kết Quả Kiểm Thử

- `npx eslint`: **0 errors, 0 warnings**.
- `npm run build`: Biên dịch thành công 100% tất cả 11 routes trong **1.97s**.
