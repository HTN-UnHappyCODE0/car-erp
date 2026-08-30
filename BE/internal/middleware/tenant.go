package middleware

import (
	"net/http"

	"erp-backend/internal/contextutil"

	"github.com/google/uuid"
)

// TenantHeaderMiddleware trích xuất X-Branch-ID từ HTTP Header và đưa vào request context
func TenantHeaderMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		branchIDStr := r.Header.Get("X-Branch-ID")
		if branchIDStr == "" {
			// Nếu không có header X-Branch-ID, tiếp tục request
			next.ServeHTTP(w, r)
			return
		}

		branchID, err := uuid.Parse(branchIDStr)
		if err != nil {
			http.Error(w, "Mã X-Branch-ID không hợp lệ (phải là UUID)", http.StatusBadRequest)
			return
		}

		ctx := contextutil.WithTenant(r.Context(), branchID, uuid.Nil, "")
		next.ServeHTTP(w, r.WithContext(ctx))
	})
}
