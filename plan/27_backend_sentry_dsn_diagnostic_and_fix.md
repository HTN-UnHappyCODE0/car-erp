# 📋 Kế Hoạch 27: Tối Ưu Hóa Chẩn Đoán & Khắc Phục SENTRY_DSN Cho Backend

## 📌 1. Bối Cảnh & Phân Tích Vì Sao Các Biến Khác Hoạt Động Nhưng SENTRY_DSN Lại Bị Trống

Người dùng cho biết:
> *"trong file .env tôi để ở server BE có nhiều thông tin khác đều đã hoạt động được nhưng SENTRY_DSN tôi cũng đặt trong đó lại báo lỗi như trên"*

### 🔍 Đi sâu vào mã nguồn để tìm lý do:

1. **Các biến khác (DB_URL, CORS, TOKEN_KEY) hoạt động được là do:**
   - Trong `BE/internal/config/config.go`:
     - `DB_URL` có giá trị fallback mặc định.
     - `CORS_ALLOWED_ORIGINS` có chuỗi fallback mặc định sẵn domain `carerp.namhoanglegal.com`.
     - `TOKEN_SYMMETRIC_KEY` có fallback mặc định.
     - `SERVER_PORT` có fallback mặc định `"8080"`.
   - **Chỉ duy nhất `SENTRY_DSN` là không có giá trị fallback**, bắt buộc phải đọc thành công từ môi trường.

2. **Cách Docker Compose truyền biến từ `.env` vào Container**:
   - Trong file `docker-compose.yml` trên Server, mục `services.backend` thường được cấu hình theo 1 trong 2 kiểu:
     - **Kiểu A (Liệt kê biến trong `environment:`)**:
       ```yaml
       backend:
         environment:
           - DB_URL=${DB_URL}
           - TOKEN_SYMMETRIC_KEY=${TOKEN_SYMMETRIC_KEY}
       ```
       👉 **Nếu trong `docker-compose.yml` chưa có dòng `- SENTRY_DSN=${SENTRY_DSN}`, thì dù bạn có viết `SENTRY_DSN=...` trong `.env`, Docker Compose cũng KHÔNG truyền biến này vào bên trong container `backend`!**
     - **Kiểu B (Chưa chạy `--force-recreate`)**:
       Khi sửa file `.env`, nếu chỉ chạy `docker compose restart backend` hoặc `docker compose up -d` mà Docker không thấy file cấu hình thay đổi, Docker sẽ giữ nguyên container cũ với biến môi trường cũ.

3. **Cần công cụ chẩn đoán trực tiếp (Deep Diagnostic) ngay trên API**:
   - Endpoint `/sentry-debug` cần soi thẳng vào tiến trình Go đang chạy:
     - Biến `os.Getenv("SENTRY_DSN")` thực tế trong container đang chứa chuỗi gì? (Bao nhiêu ký tự, có bị dấu cách hay ngoặc kép thừa không?)
     - Thử khởi tạo lại Sentry ngay tại chỗ và in lỗi chi tiết (nếu có lỗi khởi tạo cú pháp DSN).

---

## 🛠️ 2. Đề Xuất Giải Pháp & Thay Đổi Mã Nguồn (Sau Khi Bạn Duyệt)

### A. Nâng cấp endpoint `/sentry-debug` thành công cụ chẩn đoán sâu ([BE/internal/api/server.go](file:///d:/project/bad-idea/car-erp/BE/internal/api/server.go))
- Trả về chi tiết:
  1. `env_checked`: Giá trị của `os.Getenv("SENTRY_DSN")` trong container (được che bảo mật).
  2. `env_length`: Độ dài ký tự của DSN mà container đọc được.
  3. `all_sentry_keys_in_env`: Liệt kê các key môi trường bắt đầu bằng chữ `SENTRY_` mà container đang nhìn thấy.
  4. Nếu `client` chưa khởi tạo nhưng có `SENTRY_DSN` trong môi trường: Thử gọi `sentry.Init()` trực tiếp và in ra lỗi cụ thể nếu thất bại (ví dụ sai định dạng DSN).

### B. Bổ sung bộ nạp file `.env` tự động trong Go ([BE/internal/config/config.go](file:///d:/project/bad-idea/car-erp/BE/internal/config/config.go))
- Tự động quét file `.env` ở thư mục hiện tại của container (`/app/.env`, `./.env`, `../.env`) để nếu Docker Compose không truyền qua `environment:`, Go vẫn tự đọc được file `.env`.

### C. Hướng dẫn kiểm tra file `docker-compose.yml` trên Server
- Hướng dẫn người dùng kiểm tra xem `docker-compose.yml` có khai báo `SENTRY_DSN` hay dùng `env_file:` chưa.

---

## 📄 Lưu Trữ Kế Hoạch
- Kế hoạch này được lưu trữ tại `plan/27_backend_sentry_dsn_diagnostic_and_fix.md`.
