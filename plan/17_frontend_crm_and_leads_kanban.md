# 17. Kế Hoạch Chi Tiết: Phân Hệ Quản Lý Khách Hàng & Phễu Cơ Hội Bán Hàng (CRM & Leads)

Tài liệu này đặc tả chi tiết kế hoạch thiết kế và triển khai phân hệ **CRM & Leads** trên giao diện Frontend Next.js 15 kết nối Backend Go, ứng dụng mô hình Kanban Board kéo thả tương tác, kiểm soát State Machine chống gian lận và tối ưu tra cứu với `useDebounce`.

---

## 🎯 1. Mục Tiêu & Yêu Cầu Kỹ Thuật

1. **Quản Lý Khách Hàng (`Customers`)**:
   - Quản lý danh bạ khách hàng Cá nhân (`INDIVIDUAL`) và Doanh nghiệp (`ENTERPRISE`).
   - Lưu trữ: Tên, Số điện thoại, Email, CCCD / Mã số thuế, Địa chỉ.
2. **Phễu Cơ Hội Bán Hàng (`Leads`) Theo State Machine**:
   - Chuỗi trạng thái vòng đời khách hàng:
     $$\text{NEW} \longrightarrow \text{CONTACTED} \longrightarrow \text{TEST\_DRIVE} \longrightarrow \text{QUOTED} \longrightarrow \begin{cases} \text{WON} & \text{(Chốt cọc thành công)} \\ \text{LOST} & \text{(Thất bại / Hủy)} \end{cases}$$
3. **Interactive Drag & Drop Kanban Board 6 Cột**:
   - 6 cột tương ứng 6 trạng thái phễu: `NEW`, `CONTACTED`, `TEST_DRIVE`, `QUOTED`, `WON`, `LOST`.
   - Cho phép người dùng kéo thả thẻ Lead trực tiếp giữa các cột, gọi TanStack Query mutation cập nhật DB thời gian thực.
4. **Kiểm Soát Chặt Chẽ State Machine (Chống Gian Lận Nhảy Cóc)**:
   - Ngăn chặn hành vi chạy KPI kéo thẳng thẻ từ `NEW` sang `WON` mà bỏ qua `TEST_DRIVE` và `QUOTED`.
   - Nếu vi phạm: Hiển thị cờ đỏ cảnh báo quy trình và tự động giật lùi thẻ về cột cũ.
   - Khi thả vào cột `LOST`: Tự động mở Modal `UpdateLeadStatusDialog` bắt buộc ghi nhận lý do thất bại.
5. **Component `PhoneInput` Chuẩn Hóa SĐT Việt Nam**:
   - Tự động format hiển thị `098 123 4567` khi gõ, lọc bỏ chữ và ký tự đặc biệt, validate Zod regex `^(0|\+84)[3|5|7|8|9][0-9]{8}$`.
6. **Tối Ưu Tra Cứu Khách Hàng Với `useDebounce`**:
   - Trì hoãn 400ms khi gõ tìm kiếm SĐT/Tên, triệt tiêu tình trạng spam request xuống Backend.
7. **Liên Kết Dữ Liệu Chéo (Cross-Module Linking)**:
   - Form tạo Lead: Cho phép chọn dòng xe khách quan tâm từ danh mục `vehicle_models` của Inventory.
   - Trên các thẻ Lead đã chốt cọc (`WON`): Nút "Lên Đơn Bán Xe" dẫn thẳng sang phân hệ `/sales` để khởi tạo hợp đồng.
8. **Thanh Thống Kê Tỷ Lệ Chuyển Đổi Phễu CRM (Conversion KPI Bar)**:
   - Tổng số Leads, Số Lead đang chăm sóc, Tỷ lệ chốt thành công (`WON %`), Số Lead thất bại (`LOST`).

---

## 🏛️ 2. Cấu Trúc Module Theo Chuẩn FSD

```
FE/src/
├── shared/
│   ├── hooks/
│   │   └── use-debounce.ts       # Custom Hook trì hoãn tìm kiếm (400ms)
│   └── components/ui/
│       └── phone-input.tsx       # Component PhoneInput chuẩn hóa format số ĐT VN
├── entities/
│   ├── customer/                 # Types, API, Queries (useCustomers, useCreateCustomer)
│   └── lead/                     # Types, API, Queries (VALID_LEAD_TRANSITIONS, useLeads)
├── features/crm/
│   ├── create-customer-modal.tsx # Modal tạo mới khách hàng (Zod + PhoneInput)
│   ├── create-lead-modal.tsx     # Modal tạo cơ hội bán hàng (Cross-link Vehicle Models)
│   └── update-lead-status-dialog.tsx # Modal cập nhật trạng thái phễu & lý do LOST
└── app/(dashboard)/crm/
    ├── page.tsx                  # Server Component Prefetching (Leads, Customers, Models)
    └── crm-view.tsx              # Kanban Board 6 cột, Table View & Customers Tab
```

---

## 🧪 3. Kế Hoạch Kiểm Thử

- `npx eslint`: 0 errors, 0 warnings.
- `npm run build`: Biên dịch thành công 100% các routes.
- Kéo thẻ từ `NEW` sang `WON` -> Bị chặn và hiển thị thông báo vi phạm quy trình bán hàng.
- Kéo thẻ vào cột `LOST` -> Mở Modal bắt buộc nhập lý do hủy.
