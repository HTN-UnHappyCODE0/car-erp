# 📋 Kế Hoạch: Chẩn Đoán & Kích Hoạt Dữ Liệu Sentry Frontend (car-erp-frontend)

## 📌 1. Bối Cảnh Hiện Trạng
- Người dùng đã cấu hình đúng chuỗi `NEXT_PUBLIC_SENTRY_DSN` trong file môi trường trên server.
- Giao diện Frontend hiển thị huy hiệu `🟢 DSN Sẵn Sàng`.
- Tuy nhiên, trên Sentry Dashboard của dự án `car-erp-frontend`, danh sách Issues vẫn hiển thị màn hình Onboarding ban đầu (*Get Started with Sentry Issues*) và chưa có bản ghi lỗi nào.

---

## 🔍 2. Các Khả Năng Kỹ Thuật Khiến Event Không Tới Được Sentry.io

| # | Khả năng kỹ thuật | Cách kiểm tra (F12) | Giải pháp tương ứng |
|---|---|---|---|
| **A** | **Request bị AdBlocker / Brave Shields chặn** | Tab Network báo `(blocked:other)` hoặc `ERR_BLOCKED_BY_CLIENT` khi gửi tới `ingest.us.sentry.io`. | Tắt tạm AdBlock hoặc whitelist domain `ingest.us.sentry.io`. |
| **B** | **Sentry DSN bị giới hạn Domain (Allowed Domains)** | Tab Network gửi tới Sentry trả về mã **`403 Forbidden`**. | Vào Sentry Project Settings -> General -> Cấu hình Allowed Domains cho phép domain `carerp.namhoanglegal.com`. |
| **C** | **Event gửi thành công nhưng đang chờ Sentry Ingest Indexing (Lag vài chục giây)** | Tab Network trả về mã **`200 OK`**. | Chờ 30-60 giây và F5 lại trang Sentry Issues. |
| **D** | **Gói tin chưa thực sự được gửi đi từ transport** | Tab Network không xuất hiện bất kỳ request nào có chữ `envelope` hay `sentry`. | Bổ sung hàm debug transport trực tiếp `Sentry.captureMessage()` không qua boundary. |

---

## 🛠️ 3. Thông Tin Cần Người Dùng Cung Cấp Để Định Vị Lỗi Chính Xác 100%

Để xác định chính xác gói tin đang bị chặn ở đâu trong 4 khả năng trên, xin vui lòng kiểm tra nhanh trong **DevTools (F12)** trên trình duyệt:

1. **Kiểm tra tab Console (Bảng điều khiển)**:
   - Mở F12 -> tab **Console**.
   - Bấm nút **"Bắn Lỗi FE"** hoặc **"Crash Hàm"**.
   - Chụp ảnh hoặc sao chép xem Console in ra dòng gì (Có dòng `[Sentry Client] ...` hay `[Sentry Test Event ID] ...` không)?

2. **Kiểm tra tab Network (Mạng)**:
   - Mở F12 -> tab **Network** (Mạng).
   - Trong ô lọc (Filter), gõ chữ: `sentry` hoặc `envelope`.
   - Bấm nút **"Bắn Lỗi FE"**.
   - Xem có request nào màu đỏ hoặc có request gửi tới `ingest.us.sentry.io` không? Trạng thái HTTP là bao nhiêu (200, 403, hay Failed)?

---

## 🚀 4. Kế Hoạch Đề Xuất Cập Nhật Mã Nguồn (Sau Khi Người Dùng Xác Nhận)

1. **Thêm cơ chế Auto-Direct Fetch Backup**:
   - Nếu SDK Sentry gặp bất kỳ vấn đề nào về cấu hình trên client, tạo một helper gửi trực tiếp một HTTP POST payload chuẩn RFC Sentry Envelope tới DSN endpoint bằng `window.fetch` native.
2. **Cập nhật giao diện Diagnostics**:
   - Hiển thị phản hồi mạng thực tế (HTTP Status: 200/403/Failed) ngay trên màn hình Settings để người dùng không cần mở F12 cũng biết chính xác tình trạng.
3. **Lưu trữ toàn bộ tài liệu kế hoạch vào thư mục `plan/`**:
   - Tuân thủ quy chuẩn dự án, lưu trữ mọi bước chẩn đoán và triển khai.
