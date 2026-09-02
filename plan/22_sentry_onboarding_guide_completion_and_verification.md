# 📋 Kế Hoạch: Hoàn Tất Guided Setup Trên Sentry Dashboard & Xác Nhận Bắt Lỗi

## 🔍 Phát Hiện Trọng Yếu Từ Ảnh Màn Hình Mới Nhất

Nhìn vào bức ảnh mới nhất bạn vừa chụp:
1. **Dữ liệu thực tế đang tăng liên tục**:
   - Chỉ số **`Total Transactions`** đã tăng từ **`365`** lên **`440`**!
   - Điều này khẳng định chắc chắn 100%: **Trình duyệt của bạn đang kết nối trực tiếp và truyền dữ liệu liên tục về dự án `car-erp-frontend`**.

2. **Tại sao Sentry vẫn đang hiện bảng hướng dẫn?**
   - URL trên trình duyệt của bạn đang có tham số: `?guidedStep=1&project=...` (Chế độ Wizard từng bước của Sentry).
   - Khi một project mới được tạo, Sentry **khóa màn hình ở chế độ Wizard** để chờ người dùng hoàn thành 2 bước:
     - **Bước 1 (Setup)**: Bạn cần bấm nút **`Next`** (nằm ngay dưới ô lệnh `npx @sentry/wizard...`).
     - **Bước 2 (Verify)**: Sentry sẽ mở cổng lắng nghe và hiển thị nút chuyển thẳng vào hòm thư lỗi (*Take me to Issues*).

---

## 🛠️ Kế Hoạch Thao Tác (Không Cần Sửa Code Backend hay Frontend)

### Bước 1: Bấm nút `Next` trên màn hình Sentry của bạn
1. Trên tab trình duyệt đang mở Sentry (trong ảnh bạn chụp), nhìn vào khung bên trái có số 1 màu tím.
2. Bấm vào nút **`Next`** màu trắng/xám ngay bên dưới ô lệnh `npx @sentry/wizard...`.
3. Sentry sẽ chuyển sang **Bước 2 (Verify)**.

### Bước 2: Kích hoạt lỗi từ trang Cài Đặt của ERP
1. Mở tab web ERP: **`https://carerp.namhoanglegal.com/settings`**
2. Bấm nút màu đỏ: **`Crash Hàm`** (hoặc nút **`Bắn Lỗi FE`**).
3. Quay lại màn hình Sentry -> Màn hình Verify sẽ hiện dấu tích xanh thông báo đã nhận được Event đầu tiên và đưa bạn vào bảng danh sách Issues!

---

## 📄 Lưu Trữ Kế Hoạch
- Kế hoạch này được lưu trữ tại [plan/22_sentry_onboarding_guide_completion_and_verification.md](file:///d:/project/bad-idea/car-erp/plan/22_sentry_onboarding_guide_completion_and_verification.md).
