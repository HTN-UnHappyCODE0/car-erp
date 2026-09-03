# 📋 Kế Hoạch 25: Chẩn Đoán Trạng Thái SENTRY_DSN Trên Backend & Báo Mã Event ID Thực Tế

## 📌 1. Phân Tích Nguyên Nhân Từ Ảnh Sentry & Phản Hồi API

Người dùng đã bấm nút và Backend trả về:
```json
{
  "message": "Đã gửi 1 sự kiện lỗi thử nghiệm lên Sentry Backend thành công! Vui lòng kiểm tra tab Issues trên Sentry Dashboard.",
  "success": true,
  "timestamp": "2026-09-03T01:45:08Z"
}
```
Tuy nhiên, trên màn hình Sentry của dự án `car-erp-backend`, hệ thống vẫn báo:
👉 **`Waiting for events...`** (Chưa nhận được event nào).

---

## 🔍 2 Phát Hiện Kỹ Thuật Trọng Yếu:

### Phát hiện 1: Biến môi trường của Backend là `SENTRY_DSN` (Không có `NEXT_PUBLIC_`)
- Frontend dùng biến: `NEXT_PUBLIC_SENTRY_DSN`.
- Backend Go đọc biến: **`SENTRY_DSN`** (theo file [BE/internal/config/config.go](file:///d:/project/bad-idea/car-erp/BE/internal/config/config.go)).
- Nếu trong file `.env` trên server bạn chỉ đặt biến `NEXT_PUBLIC_SENTRY_DSN` mà chưa đặt biến `SENTRY_DSN`, hoặc chưa truyền vào service `backend` trong `docker-compose.yml`, thì Go Backend sẽ coi DSN là rỗng và tắt Sentry (chạy ở chế độ Disabled).
- Do hàm `sentryDebugHandler` cũ chưa kiểm tra xem DSN có rỗng không mà vẫn trả về `success: true`, khiến người dùng tưởng rằng lỗi đã được gửi đi.

### Phát hiện 2: Sai lệch Project ID của dự án `car-erp-backend`
- Nhìn vào URL trong ảnh chụp của bạn:
  `https://nam-5i.sentry.io/projects/car-erp-backend/?project=4512015881732096`
- **Project ID của `car-erp-backend` là:** **`4512015881732096`**!
- Trong khi chuỗi DSN ban đầu bạn cung cấp lại có Project ID là: `4512015873212416` (khác nhau ở dãy số cuối: `...81732096` vs `...73212416`).
- Nếu bạn đang dùng chuỗi DSN có số đuôi cũ, gói tin sẽ không bao giờ vào được dự án `car-erp-backend` này.

---

## 🛠️ 2. Đề Xuất Nâng Cấp Kỹ Thuật (Sau Khi Bạn Duyệt)

### A. Nâng cấp endpoint `/sentry-debug` trên Backend ([BE/internal/api/server.go](file:///d:/project/bad-idea/car-erp/BE/internal/api/server.go))
Kiểm tra thực tế trạng thái kết nối của Sentry Go SDK:
- Nếu `SENTRY_DSN` bị rỗng hoặc chưa nạp: Trả về cảnh báo rõ ràng kèm `success: false` và thông báo `"⚠️ SENTRY_DSN trên Backend đang bị TRỐNG..."`.
- Nếu đã nạp DSN: Gửi exception, lấy mã **`Event ID`** trả về từ Sentry Client, kèm 20 ký tự đầu của DSN đang dùng để người dùng kiểm chứng ngay lập tức.

### B. Cập nhật [FE/src/app/(dashboard)/settings/settings-view.tsx](file:///d:/project/bad-idea/car-erp/FE/src/app/(dashboard)/settings/settings-view.tsx)
- Hiển thị chi tiết phản hồi từ Backend (Event ID thực tế hoặc cảnh báo thiếu DSN) trên giao diện Cài Đặt.

---

## 📄 Lưu Trữ Kế Hoạch
- Đã lưu vĩnh viễn tại `plan/25_backend_sentry_dsn_verification_and_event_status.md`.
