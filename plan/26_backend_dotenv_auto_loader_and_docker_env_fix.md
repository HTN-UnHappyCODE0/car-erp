# 📋 Kế Hoạch 26: Tự Động Nạp File .env Cho Go Backend & Sửa Lỗi Truyền Biến Trong Docker

## 📌 1. Bối Cảnh & Phân Tích Nguyên Nhân Cốt Lõi

Người dùng đã cấu hình:
```env
SENTRY_DSN=https://cde.....
SENTRY_ENVIRONMENT=production
SENTRY_TRACES_SAMPLE_RATE=0.2
```
bên trong file `.env` của thư mục `BE/`, nhưng khi bấm "Bắn Lỗi BE" thì Backend vẫn phản hồi:
```json
{
  "error": "⚠️ SENTRY_DSN trên Backend đang bị TRỐNG hoặc chưa được kích hoạt!...",
  "sentry_configured": false,
  "success": false
}
```

### 🔍 3 Lý Do Khiến Container Backend Không Thấy Biến:
1. **Mã nguồn Go Backend hiện tại chưa có bộ nạp file `.env`**:
   - Hàm `LoadConfig()` trong [BE/internal/config/config.go](file:///d:/project/bad-idea/car-erp/BE/internal/config/config.go) chỉ đọc trực tiếp `os.Getenv(key)`. Nếu biến không được hệ điều hành / Docker truyền thẳng vào môi trường (Environment), Go không tự đọc nội dung file `.env`.
2. **File `BE/Dockerfile` không sao chép file `.env` vào runtime image**:
   - Stage 2 (`alpine:3.20`) của `BE/Dockerfile` hiện chỉ sao chép `main` và `db/migration`. File `.env` (nếu có trong `BE/`) đã bị bỏ lại ở Stage 1 (builder).
3. **Cơ chế nạp biến của Docker Compose**:
   - Khi đứng ở thư mục gốc `~/car-erp` và gõ `docker compose up -d`, Docker Compose mặc định chỉ đọc file `.env` ở thư mục gốc (`~/car-erp/.env`), chứ **không tự động đọc file con `~/car-erp/BE/.env`** trừ khi trong `docker-compose.yml` có khai báo `env_file: ./BE/.env` hoặc khai báo biến trong mục `environment:`.

---

## 🛠️ 2. Đề Xuất Giải Pháp Toàn Diện (Sau Khi Bạn Duyệt)

### A. Bổ sung bộ nạp `.env` tự động không phụ thuộc thư viện vào Go Backend ([BE/internal/config/config.go](file:///d:/project/bad-idea/car-erp/BE/internal/config/config.go))
- Thêm hàm `loadDotEnv()` chạy ngay khi `LoadConfig()` khởi động.
- Tự động quét và nạp file `.env` từ các vị trí:
  - `.env`, `.env.production`, `.env.local`
  - `/app/.env` (trong container)
  - `../.env`
- Chỉ nạp các biến nếu biến đó chưa có sẵn trong môi trường hệ điều hành (không ghi đè biến hệ thống).

### B. Cập nhật [BE/Dockerfile](file:///d:/project/bad-idea/car-erp/BE/Dockerfile)
- Trong Stage 2, thêm lệnh sao chép các file cấu hình môi trường `.env*` nếu có từ builder sang runtime image:
  ```dockerfile
  # Sao chép file cấu hình .env nếu tồn tại
  COPY --from=builder /app/.env* ./
  ```

### C. Hướng dẫn cấu hình trên Server (Đảm bảo 100% thành công)
Có 2 cách đơn giản để Docker Compose truyền biến vào:
- **Cách 1 (Khuyên dùng)**: Copy dòng `SENTRY_DSN=...` ra file `.env` ở thư mục gốc `~/car-erp/.env`.
- **Cách 2**: Thêm `SENTRY_DSN` vào mục `environment:` của service `backend` trong file `docker-compose.yml`.

---

## 📄 Lưu Trữ Kế Hoạch
- Kế hoạch này được lưu tại `plan/26_backend_dotenv_auto_loader_and_docker_env_fix.md`.
