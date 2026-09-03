# 📋 Kế Hoạch 29: Xử Lý Xung Đột Git Trên Server & Đồng Bộ BE/Dockerfile

## 📌 1. Bối Cảnh & Nguyên Nhân Lỗi

Khi lệnh deploy SSH chạy trên server:
```
error: Your local changes to the following files would be overwritten by merge:
BE/Dockerfile
Please commit your changes or stash them before you merge.
Aborting
Error: Process completed with exit code 1.
```

### 🔍 Nguyên nhân:
1. **File `BE/Dockerfile` trên server đã được chỉnh sửa trực tiếp**:
   - Trên server, bạn đã chỉnh sửa dòng đầu thành `FROM golang:1.25-alpine AS builder` (để khớp với `go 1.25.6` trong `go.mod`).
   - Do có thay đổi trực tiếp (local modifications) trên server mà chưa commit, Git từ chối `git pull origin main` để tránh làm mất nội dung chỉnh sửa của bạn.
2. **File `BE/Dockerfile` trên GitHub đang để `golang:1.23-alpine`**:
   - Cần đồng bộ mã nguồn trên repo thành `golang:1.25-alpine` (hoặc `golang:1.24-alpine`) khớp hoàn toàn với mong muốn của bạn trên server.
3. **Quy trình CI/CD trong `.github/workflows/deploy.yml` cần chống kẹt**:
   - Trong script deploy tự động của GitHub Actions, trước khi `git pull origin main`, nên có lệnh dọn dẹp các thay đổi cục bộ của file mã nguồn (`git checkout -- .`) để đảm bảo pipeline không bao giờ bị dừng giữa chừng.

---

## 🛠️ 2. Đề Xuất Thay Đổi Mã Nguồn (Sau Khi Bạn Duyệt)

### A. Cập nhật [BE/Dockerfile](file:///d:/project/bad-idea/car-erp/BE/Dockerfile)
- Cập nhật dòng 2:
  ```dockerfile
  FROM golang:1.25-alpine AS builder
  ```
- Giữ nguyên các phần tối ưu đã làm ở Stage 2:
  - `COPY --from=builder /app/.env* ./` (đưa file `.env` vào container chạy).
  - `COPY --from=builder /app/db/migration ./db/migration`
  - `CMD ["./main"]`

### B. Cập nhật [.github/workflows/deploy.yml](file:///d:/project/bad-idea/car-erp/.github/workflows/deploy.yml)
- Thêm bước dọn sạch thay đổi tạm trên server trước khi pull:
  ```bash
  git checkout -- BE/Dockerfile || true
  git pull origin main
  ```

---

## 🚀 3. Thao Tác Ngay Trên Server (Chỉ Cần 1 Dòng Lệnh)

Để giải quyết ngay lỗi Git conflict đang chặn lệnh pull trên server:
```bash
cd ~/car-erp
git checkout -- BE/Dockerfile
git pull origin main
docker compose build --no-cache backend
docker compose up -d backend
```

---

## 📄 Lưu Trữ Kế Hoạch
- Đã lưu tại `plan/29_fix_server_git_conflict_and_dockerfile_sync.md`.
