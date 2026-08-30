package database

import (
	"context"
	"fmt"
	"log"
	"time"

	"erp-backend/internal/config"

	"github.com/jackc/pgx/v5/pgxpool"
)

// PostgresPool đại diện cho connection pool quản lý kết nối tới PostgreSQL
type PostgresPool struct {
	Pool *pgxpool.Pool
}

// NewPostgresPool khởi tạo pgxpool.Pool với các thông số cấu hình an toàn cho tải cao
func NewPostgresPool(ctx context.Context, cfg config.DatabaseConfig) (*PostgresPool, error) {
	poolConfig, err := pgxpool.ParseConfig(cfg.URL)
	if err != nil {
		return nil, fmt.Errorf("lỗi phân tích DB URL: %w", err)
	}

	// Cấu hình Connection Pool Tuning
	poolConfig.MaxConns = cfg.MaxConns
	poolConfig.MinConns = cfg.MinConns
	poolConfig.MaxConnLifetime = cfg.MaxConnLifetime
	poolConfig.MaxConnIdleTime = cfg.MaxConnIdleTime
	poolConfig.HealthCheckPeriod = cfg.HealthCheckPeriod
	poolConfig.ConnConfig.ConnectTimeout = cfg.ConnectTimeout

	// Khởi tạo Pool
	pool, err := pgxpool.NewWithConfig(ctx, poolConfig)
	if err != nil {
		return nil, fmt.Errorf("lỗi khởi tạo pgxpool: %w", err)
	}

	// Ping kiểm tra kết nối liveness
	pingCtx, cancel := context.WithTimeout(ctx, 5*time.Second)
	defer cancel()

	if err := pool.Ping(pingCtx); err != nil {
		pool.Close()
		return nil, fmt.Errorf("ping PostgreSQL thất bại: %w", err)
	}

	log.Printf("[Database] Đã kết nối PostgreSQL thành công. MaxConns: %d, MinConns: %d", cfg.MaxConns, cfg.MinConns)

	return &PostgresPool{
		Pool: pool,
	}, nil
}

// Ping kiểm tra tình trạng kết nối hiện tại của pool
func (p *PostgresPool) Ping(ctx context.Context) error {
	return p.Pool.Ping(ctx)
}

// Close đóng toàn bộ kết nối trong pool một cách an toàn (Graceful)
func (p *PostgresPool) Close() {
	if p.Pool != nil {
		log.Println("[Database] Đang đóng PostgreSQL Connection Pool...")
		p.Pool.Close()
		log.Println("[Database] Đã đóng PostgreSQL Connection Pool an toàn.")
	}
}

// Stats trả về thông tin thống kê hiện tại của pool (Acquired, Idle, Total Conns)
func (p *PostgresPool) Stats() *pgxpool.Stat {
	return p.Pool.Stat()
}
