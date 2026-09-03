# 📋 Kế Hoạch 28: Đồng Bộ Cơ Chế Đọc File .env Của BE Giống Hệt 100% Với FE

## 📌 1. Lời Giải Thích Cốt Lõi: Vì Sao FE Tự Nhận Được .env Mà BE Lại Không?

Phát hiện của bạn hoàn toàn chính xác! Hãy so sánh cách hoạt động giữa FE và BE:

### 🅰️ Tại sao Frontend (FE) tự nhận được `.env`?
1. Trong `FE/Dockerfile`, lệnh `COPY . .` đã sao chép toàn bộ thư mục `FE` (bao gồm cả file bí mật `.env` bạn đặt trong `FE/`) vào `/app`.
2. **Next.js có sẵn cơ chế nội tại (built-in)** tự động mở và nạp toàn bộ biến từ `.env` khi chạy lệnh `npm run build`.
3. Vì vậy, bạn không cần khai báo gì trong `docker-compose.yml`, FE vẫn tự đọc được 100%.

### 🅱️ Tại sao Backend (BE) lại KHÔNG nhận được file `.env` bạn để trong `BE/`?
Có 2 điểm khác biệt mấu chốt so với FE:
1. **Dockerfile của BE (`BE/Dockerfile`) bị thiếu bước sao chép file `.env` vào runtime**:
   - `BE/Dockerfile` sử dụng kỹ thuật multi-stage build:
     - Stage 1 (builder): `COPY . .` có file `.env`.
     - **Stage 2 (runtime alpine)**: Chỉ sao chép file thực thi `main` và thư mục `db/migration`. File `.env` của bạn **bị bỏ lại ở Stage 1** và không hề có mặt trong container chạy thực tế!
2. **Ngôn ngữ Go không có cơ chế tự động đọc file `.env` như Next.js**:
   - Next.js tự đọc `.env`, còn Go chỉ đọc biến từ hệ điều hành qua `os.Getenv()`. Nếu trong code Go không viết hàm đọc file `.env` từ ổ đĩa thì Go sẽ không tự nạp được.

---

## 🛠️ 2. Giải Pháp Đồng Bộ: Đưa BE Về Cơ Chế Hoạt Động Y Hệt FE

Để bạn **chỉ cần để file `.env` trong thư mục `BE/` giống hệt như đã làm với `FE/` mà không cần đụng chạm gì đến `docker-compose.yml`**:

### Bước 1: Sửa [BE/Dockerfile](file:///d:/project/bad-idea/car-erp/BE/Dockerfile)
Ở Stage 2 (runtime), bổ sung lệnh sao chép file `.env*` từ Stage 1 sang:
```dockerfile
# Sao chép file .env từ builder sang runtime image (giống hệt FE)
COPY --from=builder /app/.env* ./
```

### Bước 2: Bổ sung bộ nạp file `.env` tự động vào [BE/internal/config/config.go](file:///d:/project/bad-idea/car-erp/BE/internal/config/config.go)
- Viết hàm `loadDotEnv()` chạy ngay khi `LoadConfig()` bắt đầu:
  - Tự động mở file `.env`, `.env.production` nằm cùng thư mục với file `main`.
  - Tách từng dòng `KEY=VALUE` và nạp vào `os.Setenv()`.
  - Không cần cài thêm bất kỳ thư viện bên ngoài nào, dùng 100% Go standard library an toàn tuyệt đối.

---

## 🧪 3. Kết Quả Sau Khi Triển Khai
- Bạn **không cần sửa `docker-compose.yml`**.
- File `.env` bạn đã để sẵn trong `BE/` với `SENTRY_DSN=...` sẽ được container BE tự động sao chép và nạp vào lúc khởi động y như FE.
- Bấm nút "Bắn Lỗi BE" -> Thành công ngay lập tức!
