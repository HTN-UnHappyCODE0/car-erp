# 14. Thiết Kế Các Phân Hệ Doanh Nghiệp ERP & Quy Trình Nghiệp Vụ Chuyên Sâu (Enterprise Modules)

Tài liệu này đặc tả chi tiết các phân hệ nghiệp vụ ERP cốt lõi trên Frontend Next.js 15 kết nối Backend Go: **Inventory (Kho Xe & Model)** và **CRM & Leads (Khách Hàng & Phễu Bán Hàng)**.

---

## 🏛️ 1. Phân Hệ Quản Lý Kho Xe & Mẫu Xe (Inventory)

- **Danh mục Dòng xe (`Vehicle Models`)**: Quản lý Hãng, Model, Năm sản xuất, Phiên bản (Trim). Modal `CreateModelModal` thêm mới model.
- **Kho xe vật lý (`Vehicles`)**: Quản lý xe thực tế theo số khung VIN (17 ký tự), Số máy, Màu sắc, Giá nhập từ hãng (Decimal VND), Chi nhánh trực thuộc.
- **VIN Real-Time Input Masking (ISO 3779)**: Tự động viết hoa và chặn ngay phím `I`, `O`, `Q` (chống nhầm lẫn số `1`, `0`), kiểm tra Zod Regex.
- **Component `CurrencyInput`**: Tự động định dạng dấu phẩy phân tách hàng nghìn (ví dụ: `1,250,000,000 ₫`) và truyền chuỗi số thô (`1250000000`) vào form.
- **UI-Level RBAC**: Ẩn nút "Nhập Xe", "Thêm Model", "Chuyển chi nhánh" đối với vai trò không có thẩm quyền (`mechanic`, `salesperson`).
- **Thanh KPI Tồn Kho**: Thống kê số xe, tổng giá trị tồn kho, số xe `IN_STOCK`, `RESERVED`, `MAINTENANCE`.

---

## 🚗 2. Phân Hệ CRM & Phễu Cơ Hội Bán Hàng (CRM & Leads)

- **Quản lý Khách hàng (`Customers`)**: Cá nhân (`INDIVIDUAL`) & Doanh nghiệp (`ENTERPRISE`), Số điện thoại, Email, CCCD / Mã số thuế, Địa chỉ.
- **Phễu Cơ Hội Bán Hàng (`Leads`)**:
  - Chuỗi trạng thái vòng đời khách hàng:
    $$\text{NEW} \longrightarrow \text{CONTACTED} \longrightarrow \text{TEST\_DRIVE} \longrightarrow \text{QUOTED} \longrightarrow \begin{cases} \text{WON} & \text{(Chốt cọc thành công)} \\ \text{LOST} & \text{(Thất bại / Hủy)} \end{cases}$$
- **Interactive Drag & Drop Kanban Board**:
  - 6 cột tương ứng 6 trạng thái phễu bán hàng.
  - Cho phép kéo thả thẻ Lead trực quan giữa các cột, cập nhật realtime với TanStack Query mutation.
- **Strict State Machine Validation (Chống Gian Lận)**:
  - Kiểm tra tính hợp lệ trước khi cho phép thả thẻ (ví dụ: Chặn nhảy cóc từ `NEW` sang `WON`). Nếu vi phạm, hiển thị banner cảnh báo và giật lùi thẻ về vị trí cũ.
  - Khi chuyển sang `LOST`, bắt buộc mở Dialog ghi nhận lý do thất bại (Giá cao, Mua hãng khác, Chưa đủ tài chính...).
- **Component `PhoneInput`**: Chuẩn hóa định dạng SĐT di động Việt Nam `098 123 4567`, tích hợp Zod regex.
- **Tối Ưu Tra Cứu Với `useDebounce`**: Trì hoãn 400ms khi gõ tìm kiếm SĐT/Tên khách hàng, triệt tiêu gánh nặng request liên tục xuống Backend.
- **Cross-Module Linking**:
  - Khi tạo Lead: Chọn dòng xe quan tâm từ danh mục `vehicle_models` của Inventory.
  - Khi Lead đạt trạng thái `WON`: Nút "Lên Hợp Đồng Bán Xe" điều hướng thẳng sang phân hệ `/sales`.

---

## 🧪 3. Kết Quả Kiểm Thử

- `npx eslint`: **0 errors, 0 warnings**.
- `npm run build`: Biên dịch thành công 100% tất cả 11 routes.
