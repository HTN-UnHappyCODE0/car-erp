package config

import (
	"os"
	"path/filepath"
	"testing"
)

func TestLoadDotEnv(t *testing.T) {
	// Tạo file .env tạm thời để kiểm thử
	tmpDir := t.TempDir()
	envPath := filepath.Join(tmpDir, ".env")
	content := []byte("TEST_CUSTOM_KEY=hello_sentry_world\nTEST_QUOTED_KEY=\"quoted_value\"\n# Comment line\n")
	if err := os.WriteFile(envPath, content, 0644); err != nil {
		t.Fatalf("Không thể tạo file tạm: %v", err)
	}

	// Đổi working directory tạm thời
	origDir, _ := os.Getwd()
	defer os.Chdir(origDir)
	_ = os.Chdir(tmpDir)

	// Chạy loadDotEnv
	loadDotEnv()

	if val := os.Getenv("TEST_CUSTOM_KEY"); val != "hello_sentry_world" {
		t.Errorf("Kỳ vọng TEST_CUSTOM_KEY='hello_sentry_world', nhận được: '%s'", val)
	}

	if val := os.Getenv("TEST_QUOTED_KEY"); val != "quoted_value" {
		t.Errorf("Kỳ vọng TEST_QUOTED_KEY='quoted_value', nhận được: '%s'", val)
	}
}
