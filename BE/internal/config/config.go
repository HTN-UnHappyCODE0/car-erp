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

// LoadConfig tải cấu hình từ biến môi trường với kiểm tra an ninh bắt buộc
func LoadConfig() *Config {
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
	corsOriginsRaw := getEnv("CORS_ALLOWED_ORIGINS", "http://localhost:3000,http://127.0.0.1:3000")
	var corsOrigins []string
	for _, origin := range strings.Split(corsOriginsRaw, ",") {
		trimmed := strings.TrimSpace(origin)
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
