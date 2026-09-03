# --- Stage 1: Build binary ---
FROM golang:1.23-alpine AS builder

WORKDIR /app

# Cài đặt git và dependencies cần thiết
RUN apk add --no-cache git

# Copy go mod và sum để tận dụng cache layer
COPY go.mod go.sum ./
RUN go mod download

# Copy toàn bộ mã nguồn Backend
COPY . .

# Build file thực thi tĩnh (static binary)
RUN CGO_ENABLED=0 GOOS=linux go build -ldflags="-w -s" -o main ./cmd/server/main.go

# --- Stage 2: Runtime image siêu nhẹ ---
FROM alpine:3.20

WORKDIR /app

# Cài đặt chứng chỉ SSL và timezone cần thiết cho kết nối Database/API ngoài
RUN apk add --no-cache ca-certificates tzdata

# Copy file binary từ builder sang
COPY --from=builder /app/main .

# Copy thư mục database migrations sang runtime image
COPY --from=builder /app/db/migration ./db/migration

# Copy file .env nếu có từ builder sang runtime image (đồng bộ cơ chế với FE)
COPY --from=builder /app/.env* ./

EXPOSE 8080

CMD ["./main"]
