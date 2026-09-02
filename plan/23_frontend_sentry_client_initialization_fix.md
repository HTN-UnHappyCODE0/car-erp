# 📋 Kế Hoạch: Khắc Phục Triệt Để Khởi Tạo Sentry Client Trên Next.js App Router

## 🔍 Phân Tích Nguyên Nhân Cốt Lõi Từ Ảnh Console Của Bạn

1. **Từ ảnh chụp F12 Console của bạn**:
   - `Uncaught TypeError: window.myUndefinedFunction is not a function at ...`
   - Lỗi này xảy ra trực tiếp trên trình duyệt, nhưng Sentry không bắt được.
2. **Nguyên nhân kỹ thuật**:
   - Trong **Next.js App Router (sử dụng thư mục `src/` và build `standalone`)**, file `FE/sentry.client.config.ts` nằm ở thư mục gốc không tự động được nạp vào client bundle nếu không được import trực tiếp vào Root Client Entrypoint.
   - File `src/instrumentation.ts` chỉ chạy trên **Server Node.js và Edge Runtime**, hoàn toàn KHÔNG chạy trên trình duyệt client.
   - Do đó, SDK Sentry trên trình duyệt **chưa bao giờ được gọi lệnh `Sentry.init()`**, dẫn đến `window.onerror` không được Sentry lắng nghe và mọi lỗi đều bị bỏ qua!

---

## 🛠️ Giải Pháp Kỹ Thuật Chi Tiết (Action Plan)

### 1. Import trực tiếp `sentry.client.config` vào `FE/src/app/providers.tsx`
- File `FE/src/app/providers.tsx` là Client Provider (`'use client'`) bao bọc toàn bộ ứng dụng (`<Providers>{children}</Providers>`).
- Khi import `sentry.client.config` trực tiếp vào đây, **100% mọi trang web trên trình duyệt khi tải lên sẽ lập tức thực thi `Sentry.init()` ngay từ milli-giây đầu tiên**.

### 2. Cập nhật `FE/sentry.client.config.ts`
- Thêm cờ `sampleRate: 1.0` (Tỷ lệ ghi nhận lỗi 100%).
- Đảm bảo in log xác nhận rõ ràng vào Console:
  `console.log('✅ [Sentry Client] Đã khởi tạo thành công!')`

### 3. Kiểm thử và xác nhận
- Chạy `npm run build` trên local -> Thành công.
- Đẩy lên GitHub -> Pipeline tự động deploy lên server.
- Người dùng vào trang `/settings` -> Console sẽ in dòng `✅ [Sentry Client] Đã khởi tạo thành công!`.
- Bấm nút **"Crash Hàm"** hoặc **"Bắn Lỗi FE"** -> Sự kiện sẽ bay thẳng vào Sentry Issues ngay lập tức!

---

## 📄 Lưu Trữ Kế Hoạch
- Kế hoạch này được lưu trữ tại `plan/23_frontend_sentry_client_initialization_fix.md`.
