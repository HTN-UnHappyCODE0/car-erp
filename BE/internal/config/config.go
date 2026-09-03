package config

import (
	"log"
	"os"
	"strconv"
	"strings"
	"time"
)

const DefaultDevJWTKey = "super_secret_car_erp_jwt_key_32bytes!"

// Config chứa toàn bộ cấu hình hệ thống Backend
type Config struct {
	Environment          string
	ServerPort           string
	TokenSymmetricKey    string
	AccessTokenDuration  time.Duration
	RefreshTokenDuration time.Duration
	CORSAllowedOrigins   []string
	Database             DatabaseConfig
	Sentry               SentryConfig
}

// SentryConfig chứa cấu hình giám sát lỗi và APM Sentry
type SentryConfig struct {
	DSN              string
	Environment      string
	TracesSampleRate float64
	AttachStacktrace bool
}

// DatabaseConfig chứa cấu hình kết nối và connection pool PostgreSQL
type DatabaseConfig struct {
	URL               string
	MaxConns          int32
	MinConns          int32
	MaxConnLifetime   time.Duration
	MaxConnIdleTime   time.Duration
	HealthCheckPeriod time.Duration
	ConnectTimeout    time.Duration
}

// loadDotEnv tự động tìm và nạp các biến từ file .env nếu có vào môi trường tiến trình
func loadDotEnv() {
	// Thứ tự ưu tiên: .env.production -> .env.local -> .env
	candidates := []string{
		".env.production",
		".env.local",
		".env",
		"/app/.env.production",
		"/app/.env.local",
		"/app/.env",
		"../.env",
		"BE/.env",
	}

	for _, path := range candidates {
		content, err := os.ReadFile(path)
		if err != nil {
			continue
		}

		lines := strings.Split(string(content), "\n")
		for _, line := range lines {
			line = strings.TrimSpace(line)
			// Bỏ qua dòng trống hoặc dòng comment (#)
			if line == "" || strings.HasPrefix(line, "#") {
				continue
			}

			parts := strings.SplitN(line, "=", 2)
			if len(parts) == 2 {
				key := strings.TrimSpace(parts[0])
				val := strings.TrimSpace(parts[1])

				// Xử lý loại bỏ dấu nháy đơn ' hoặc nháy kép " bọc quanh giá trị
				val = strings.Trim(val, `"'`)

				// Chỉ nạp nếu biến môi trường hệ thống chưa có (không ghi đè biến do Docker truyền vào)
				if key != "" && os.Getenv(key) == "" {
					os.Setenv(key, val)
				}
			}
		}
	}
}

// LoadConfig tải cấu hình từ biến môi trường với kiểm tra an ninh bắt buộc
func LoadConfig() *Config {
	loadDotEnv()

	env := getEnv("APP_ENV", "development")
	jwtKey := getEnv("TOKEN_SYMMETRIC_KEY", DefaultDevJWTKey)

	// Kiểm tra bảo mật: Không bao giờ cho phép sử dụng JWT Key mặc định ở môi trường Production
	if env == "production" {
		if jwtKey == DefaultDevJWTKey {
			log.Fatal("[Security CRITICAL] Không được sử dụng TOKEN_SYMMETRIC_KEY mặc định ở môi trường Production! Vui lòng cấu hình biến môi trường TOKEN_SYMMETRIC_KEY ngẫu nhiên bảo mật.")
		}
		if len(jwtKey) < 32 {
			log.Fatal("[Security CRITICAL] TOKEN_SYMMETRIC_KEY phải có độ dài tối thiểu 32 ký tự.")
		}
	}

	// Đọc danh sách domain CORS được phép
	defaultCors := "http://localhost:3000,http://127.0.0.1:3000,https://carerp.namhoanglegal.com,https://api-carerp.namhoanglegal.com"
	corsOriginsRaw := getEnv("CORS_ALLOWED_ORIGINS", defaultCors)
	var corsOrigins []string
	for _, origin := range strings.Split(corsOriginsRaw, ",") {
		trimmed := strings.TrimSpace(origin)
		trimmed = strings.TrimRight(trimmed, "/")
		if trimmed != "" {
			corsOrigins = append(corsOrigins, trimmed)
		}
	}

	return &Config{
		Environment:          env,
		ServerPort:           getEnv("SERVER_PORT", "8080"),
		TokenSymmetricKey:    jwtKey,
		AccessTokenDuration:  getEnvAsDuration("ACCESS_TOKEN_DURATION", 15*time.Minute),   // Access Token 15 phút
		RefreshTokenDuration: getEnvAsDuration("REFRESH_TOKEN_DURATION", 7*24*time.Hour), // Refresh Token 7 ngày
		CORSAllowedOrigins:   corsOrigins,
		Database: DatabaseConfig{
			URL:               getEnv("DB_URL", "postgresql://erp_admin:password@localhost:5432/erp_automotive?sslmode=disable"),
			MaxConns:          getEnvAsInt32("DB_MAX_CONNS", 25),
			MinConns:          getEnvAsInt32("DB_MIN_CONNS", 5),
			MaxConnLifetime:   getEnvAsDuration("DB_MAX_CONN_LIFETIME", 30*time.Minute),
			MaxConnIdleTime:   getEnvAsDuration("DB_MAX_CONN_IDLE_TIME", 5*time.Minute),
			HealthCheckPeriod: getEnvAsDuration("DB_HEALTH_CHECK_PERIOD", 1*time.Minute),
			ConnectTimeout:    getEnvAsDuration("DB_CONNECT_TIMEOUT", 5*time.Second),
		},
		Sentry: SentryConfig{
			DSN:              getEnv("SENTRY_DSN", getEnv("SENTRY_BACKEND_DSN", getEnv("NEXT_PUBLIC_SENTRY_DSN_BACKEND", ""))),
			Environment:      getEnv("SENTRY_ENVIRONMENT", env),
			TracesSampleRate: getEnvAsFloat64("SENTRY_TRACES_SAMPLE_RATE", 1.0),
			AttachStacktrace: true,
		},
	}
}

func getEnv(key, fallback string) string {
	if val := os.Getenv(key); val != "" {
		return val
	}
	return fallback
}

func getEnvAsInt32(key string, fallback int32) int32 {
	valStr := os.Getenv(key)
	if valStr == "" {
		return fallback
	}
	val, err := strconv.ParseInt(valStr, 10, 32)
	if err != nil {
		return fallback
	}
	return int32(val)
}

func getEnvAsFloat64(key string, fallback float64) float64 {
	valStr := os.Getenv(key)
	if valStr == "" {
		return fallback
	}
	val, err := strconv.ParseFloat(valStr, 64)
	if err != nil {
		return fallback
	}
	return val
}

func getEnvAsDuration(key string, fallback time.Duration) time.Duration {
	valStr := os.Getenv(key)
	if valStr == "" {
		return fallback
	}
	val, err := time.ParseDuration(valStr)
	if err != nil {
		return fallback
	}
	return val
}
