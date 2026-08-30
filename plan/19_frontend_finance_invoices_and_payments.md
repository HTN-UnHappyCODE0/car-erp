# 19. Kế Hoạch Chi Tiết: Phân Hệ Quản Lý Tài Chính, Hóa Đơn & Ghi Nhận Thanh Toán (/finance)

Tài liệu này đặc tả chi tiết kế hoạch thiết kế và triển khai phân hệ **Finance (Tài Chính, Hóa Đơn & Sổ Cái Dòng Tiền)** trên giao diện Frontend Next.js 15 kết nối Backend Go, ứng dụng Dynamic Zod Validation chặn thu lố, Cross-Module Cache Invalidation đồng bộ thời gian thực và Idempotency Error Mapping cho mã đối soát ngân hàng.

---

## 🎯 1. Mục Tiêu & Yêu Cầu Kỹ Thuật

1. **Sổ Cái Hóa Đơn & Công Nợ Doanh Nghiệp (`Invoices`)**:
   - Quản lý toàn bộ hóa đơn phát sinh từ 2 nguồn: Bán xe (`Sales Order`) và Xưởng dịch vụ (`Repair Order`).
   - Theo dõi: Mã hóa đơn, Khách hàng, Tổng giá trị phải thu, Đã thanh toán thực tế, Số tiền còn nợ, Hạn thanh toán (`due_date`), Ngày phát hành (`issued_date`).
   - 4 trạng thái hóa đơn: `UNPAID` (Chưa thanh toán), `PARTIAL` (Đã thu 1 phần), `PAID` (Đã hoàn tất 100%), `OVERDUE` (Quá hạn thanh toán).
2. **Chặn Thu Lố Tiền Ở Tầng Zod (Dynamic Max Validation)**:
   - Trong `CreatePaymentDialog`, khởi tạo quy tắc validation Zod động theo số dư nợ còn lại (`remainingAmount`):
     ```typescript
     amount: z
       .string()
       .min(1, 'Vui lòng nhập số tiền thanh toán')
       .refine((val) => Number(val) > 0, { message: 'Số tiền thu phải lớn hơn 0' })
       .refine((val) => Number(val) <= remainingAmount, {
         message: `Số tiền thu không được vượt quá số nợ còn lại (${formatVND(remainingAmount)})`,
       });
     ```
   - Chặn đứng hoàn toàn việc gõ thừa số 0 hoặc thu lố dù chỉ 1 đồng.
3. **Đồng Bộ Chéo Dữ Liệu Thời Gian Thực (Cross-Module Cache Invalidation)**:
   - Khi ghi nhận thanh toán thành công trong `useCreatePayment`, hệ thống tự động bắn tín hiệu làm mới toàn bộ cache của các phân hệ liên quan:
     ```typescript
     queryClient.invalidateQueries({ queryKey: ['invoices'] });
     queryClient.invalidateQueries({ queryKey: ['sales-orders'] });
     queryClient.invalidateQueries({ queryKey: ['repair-orders'] });
     queryClient.invalidateQueries({ queryKey: ['vehicles'] });
     ```
   - Khi khách đóng đủ tiền cọc, phân hệ Bán xe (`/sales`) lập tức thấy hợp đồng chuyển sang `DEPOSIT_PAID` mà không cần reload trang.
4. **Chỉ Điểm Lỗi Mã Đối Soát Ngân Hàng (Idempotency Error Mapping)**:
   - Bắt mã lỗi 400/409 (hoặc Duplicate Key) trong khối `catch` và gán lỗi trực tiếp vào trường `setError('reference_code', { message: 'Mã giao dịch ngân hàng này đã được ghi nhận trước đó. Vui lòng kiểm tra lại sao kê!' })`.
5. **Thanh Lũy Kế Tiến Độ Thu Tiền (`PaymentProgressBar`)**:
   - Hiển thị trực quan tỷ lệ % đã thu / còn nợ với dải màu trạng thái (0% Xám ➡️ 1-99% Xanh dương ➡️ 100% Xanh lục hoàn tất).
6. **Lịch Sử Giao Dịch Dòng Tiền (`Transaction Timeline Drawer`)**:
   - Drawer xem chi tiết từng hóa đơn, hiển thị Timeline toàn bộ các lần khách đóng tiền theo thứ tự thời gian.
7. **Thanh Thống Kê Dòng Tiền & Công Nợ (Finance KPI Bar)**:
   - Tổng giá trị hóa đơn phát hành, Tổng tiền thực thu (Đã vào két), Tổng công nợ còn phải thu (Receivables), Số hóa đơn quá hạn.
8. **Bộ Lọc Nhanh Trạng Thái Hóa Đơn (Status Filter Pills)**:
   - Lọc nhanh 1-click giữa các trạng thái `Tất Cả`, `Chưa Thu (UNPAID)`, `Thu Một Phần (PARTIAL)`, `Đã Thu Đủ (PAID)`, `Quá Hạn (OVERDUE)`.

---

## 🏛️ 2. Cấu Trúc Module Theo Chuẩn FSD

```
FE/src/
├── entities/invoice/             # Types, API, Queries (useInvoices, useCreatePayment với Cross-Module Invalidate)
├── features/finance/
│   ├── payment-progress-bar.tsx  # Component thanh lũy kế tiến độ thanh toán (%)
│   ├── create-payment-dialog.tsx # Dialog ghi nhận thu tiền (Dynamic Zod Max + Idempotency Error Mapping)
│   └── invoice-detail-drawer.tsx # Modal / Drawer xem chi tiết hóa đơn & Timeline giao dịch
└── app/(dashboard)/finance/
    ├── page.tsx                  # Server Component Prefetching (Invoices, Transactions)
    └── finance-view.tsx          # Finance KPI Bar, Status Filter, Invoices & Ledger Tabs
```

---

## 🧪 3. Kết Quả Kiểm Thử

- `npx eslint`: **0 errors, 0 warnings**.
- `npm run build`: Biên dịch thành công 100% tất cả 11 routes.
