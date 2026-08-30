package db

import (
	"context"
	"log"
	"os"
	"testing"
	"time"

	"erp-backend/internal/config"
	"erp-backend/internal/database"
)

var testStore Store
var testPool *database.PostgresPool

func TestMain(m *testing.M) {
	cfg := config.LoadConfig()

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	var err error
	testPool, err = database.NewPostgresPool(ctx, cfg.Database)
	if err != nil {
		log.Printf("[Test Notice] Bỏ qua db/sqlc integration tests vì không có database kết nối: %v", err)
		os.Exit(0)
	}
	defer testPool.Close()

	testStore = NewStore(testPool.Pool)

	os.Exit(m.Run())
}
