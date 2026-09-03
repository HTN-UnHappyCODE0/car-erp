# 📋 Kế Hoạch 24: Sửa Lỗi 404 Endpoint Sentry Backend & Đồng Bộ Đường Dẫn Gọi API

## 📌 1. Bối Cảnh & Nguyên Nhân Lỗi 404

Khi người dùng bấm nút **"Bắn Lỗi BE"** trên trang Cài Đặt, trình duyệt gửi request:
```
Request URL: https://api-carerp.namhoanglegal.com/sentry-debug
Request Method: GET
Status Code: 404 Not Found
```

### 🔍 Nguyên nhân cốt lõi:
1. **Frontend gọi thiếu tiền tố `/api/v1`**:
   - Biến `NEXT_PUBLIC_API_URL` trong file `.env` của người dùng được đặt là: `https://api-carerp.namhoanglegal.com` (không có đuôi `/api/v1`).
   - Hàm `handleTestSentryBE` trong [settings-view.tsx](file:///d:/project/bad-idea/car-erp/FE/src/app/(dashboard)/settings/settings-view.tsx) gọi trực tiếp:
     `${process.env.NEXT_PUBLIC_API_URL}/sentry-debug` -> thành `https://api-carerp.namhoanglegal.com/sentry-debug`.
   - Trong khi đó, Backend Go chỉ mới khai báo endpoint này bên trong nhóm `v1 := server.router.Group("/api/v1")` -> Đường dẫn đúng của Backend là `/api/v1/sentry-debug`.
2. **Backend cần thêm Route Alias ở tầng Root**:
   - Backend Go nên lắng nghe ở CẢ HAI đường dẫn:
     - `/sentry-debug` (Root level)
     - `/api/v1/sentry-debug` (API v1 level)
   - Điều này đảm bảo dù client hoặc người dùng gõ có hay không có `/api/v1` thì Backend đều nhận và phản hồi thành công.
3. **Backend Container cần được Rebuild trên Server**:
   - Sau khi cập nhật code Go, cần chạy `docker compose build backend && docker compose up -d backend` để nạp binary mới có tích hợp Sentry Go SDK.

---

## 🛠️ 2. Các Thay Đổi Đề Xuất Thực Hiện (Sau Khi Người Dùng Xác Nhận)

### A. Frontend: [FE/src/app/(dashboard)/settings/settings-view.tsx](file:///d:/project/bad-idea/car-erp/FE/src/app/(dashboard)/settings/settings-view.tsx)
- Sử dụng hằng số chuẩn `API_BASE_URL` (từ `@/shared/config/constants`) thay vì đọc thô `process.env.NEXT_PUBLIC_API_URL`.
- `API_BASE_URL` có hàm chuẩn hóa `getApiBaseUrl()` tự động thêm `/api/v1` nếu người dùng quên không điền trong `.env`.
- Mã lệnh:
  ```typescript
  const res = await fetch(`${API_BASE_URL}/sentry-debug`);
  ```

### B. Backend: [BE/internal/api/server.go](file:///d:/project/bad-idea/car-erp/BE/internal/api/server.go)
- Đăng ký thêm route `/sentry-debug` ở cả tầng Root lẫn tầng `/api/v1`:
  ```go
  sentryDebugHandler := func(c *gin.Context) {
      sentryutil.CaptureError(c.Request.Context(), fmt.Errorf("Test Sentry Error từ Car ERP Backend (Thử nghiệm thành công!)"), map[string]string{
          "test": "true",
          "source": "sentry-debug-endpoint",
      })
      sentryutil.Flush(2 * time.Second)

      c.JSON(http.StatusOK, gin.H{
          "success": true,
          "message": "Đã gửi 1 sự kiện lỗi thử nghiệm lên Sentry Backend thành công! Vui lòng kiểm tra tab Issues trên Sentry Dashboard.",
          "timestamp": time.Now().Format(time.RFC3339),
      })
  }

  // Hỗ trợ cả /sentry-debug và /api/v1/sentry-debug
  server.router.GET("/sentry-debug", sentryDebugHandler)
  v1.GET("/sentry-debug", sentryDebugHandler)
  ```

---

## 🧪 3. Kế Hoạch Kiểm Thử & Triển Khai
1. Kiểm tra build FE: `npm run build` pass.
2. Kiểm tra test BE: `go test ./...` pass.
3. Đẩy lên GitHub.
4. Trên Server: Chạy build lại cả Backend lẫn Frontend:
   ```bash
   cd ~/car-erp
   git pull origin main
   docker compose build --no-cache backend frontend
   docker compose up -d backend frontend
   ```
5. Bấm nút **"Bắn Lỗi BE"** -> Trả về `HTTP 200 OK` và hiển thị thông báo thành công.
