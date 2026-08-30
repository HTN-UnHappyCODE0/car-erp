# 18. Kế Hoạch Chi Tiết: Phân Hệ Quản Lý Bán Xe, Order Stepper & Hủy Đơn Nghiêm Ngặt (/sales)

Tài liệu này đặc tả chi tiết kế hoạch thiết kế và triển khai phân hệ **Sales (Hợp Đồng & Đơn Bán Xe)** trên giao diện Frontend Next.js 15 kết nối Backend Go, ứng dụng Dependent Dropdown chọn Model -> VIN IN_STOCK, Order Stepper 4 bước và quy trình hủy đơn xử lý cọc kế toán nghiêm ngặt.

---

## 🎯 1. Mục Tiêu & Yêu Cầu Kỹ Thuật

1. **Lập Đơn Đặt Hàng Bán Xe (`Create Sales Order`)**:
   - Ghép nối 3 luồng dữ liệu nghiệp vụ:
     - **Khách hàng** (từ CRM).
     - **Xe vật lý cụ thể trong kho theo số khung VIN** (từ Inventory).
     - **Giá trị tài chính** (Tổng giá bán `total_amount`, Chiết khấu `discount_amount`, Tiền đặt cọc `deposit_amount` với `CurrencyInput`).
2. **Dependent Dropdown (Dropdown Phụ Thuộc)**:
   - Khi Sales chọn Mẫu xe (ví dụ: `Toyota Camry 2.5Q`), ô Select tiếp theo (Số VIN) tự động lọc và **chỉ hiển thị các xe thuộc Model đó đang có trạng thái `IN_STOCK` tại chi nhánh hiện tại**.
   - Khi chọn xe cụ thể: Tự động hiển thị tóm tắt màu ngoại/nội thất, số máy để đối chiếu.
   - Nếu chưa chọn Model -> Ô VIN bị vô hiệu hóa kèm thông báo nhắc nhở.
3. **Thanh Tiến Trình Đơn Hàng (`Order Stepper Component`)**:
   - Hiển thị trực quan 4 bước của State Machine:
     $$\text{DRAFT (Nháp)} \longrightarrow \text{DEPOSIT\_PAID (Đã Nhận Cọc)} \longrightarrow \text{FULL\_PAID (Thanh Toán Đủ)} \longrightarrow \text{DELIVERED (Đã Bàn Giao)}$$
   - Tự động sáng đèn tương ứng với trạng thái thực tế của hợp đồng.
4. **Quy Trình Hủy Đơn & Xử Lý Cọc Kế Toán Nghiêm Ngặt (`Cancel Order`)**:
   - Khi hủy đơn, chiếc xe tương ứng tự động được **mở khóa về kho (`IN_STOCK`)**.
   - **Ràng buộc xử lý cọc**: Nếu đơn hàng đã có `deposit_amount > 0`, **tuyệt đối vô hiệu hóa (disabled) lựa chọn `NONE`**, ép buộc Sales/Quản lý phải chọn 1 trong 3 phương án kế toán:
     - `FORFEITED`: Tịch thu tiền cọc (Ghi nhận Thu nhập khác của đại lý do khách vi phạm hợp đồng).
     - `PENDING_REFUND`: Chờ kế toán làm thủ tục hoàn trả tiền cọc cho khách.
     - `CREDITED`: Bảo lưu số tiền cọc để cấn trừ vào lần mua xe kế tiếp.
   - Bắt buộc nhập lý do hủy (tối thiểu 5 ký tự).
5. **Thanh Thống Kê Doanh Thu & Hợp Đồng (Sales KPI Summary Bar)**:
   - Tổng số đơn hàng, Doanh thu đã bàn giao xe (`DELIVERED`), Tiền cọc đang giữ (`DEPOSIT_PAID`), Số đơn đã hủy (`CANCELLED`).
6. **Bộ Lọc Nhanh Trạng Thái (Status Filter Pills)**:
   - Lọc nhanh 1-click giữa các trạng thái `Tất Cả`, `Nháp`, `Đã Cọc`, `Thanh Toán Đủ`, `Đã Giao Xe`, `Đã Hủy`.

---

## 🏛️ 2. Cấu Trúc Module Theo Chuẩn FSD

```
FE/src/
├── entities/sales-order/         # Types, API, Queries (useSalesOrders, useCreateSalesOrder)
├── features/sales/
│   ├── order-stepper.tsx         # Component hiển thị thanh tiến trình 4 bước đơn hàng
│   ├── create-order-modal.tsx    # Modal tạo đơn với Dependent Dropdown (Model -> VIN IN_STOCK)
│   └── cancel-order-dialog.tsx   # Dialog hủy đơn nghiêm ngặt (Disabled NONE nếu có cọc)
└── app/(dashboard)/sales/
    ├── page.tsx                  # Server Component Prefetching (Orders, Vehicles, Customers)
    └── sales-view.tsx            # Sales KPI Bar, Status Filter, Order Stepper & DataTable
```

---

## 🧪 3. Kết Quả Kiểm Thử

- `npx eslint`: **0 errors, 0 warnings**.
- `npm run build`: Biên dịch thành công 100% tất cả 11 routes.
