package httperr

import (
	"errors"
	"fmt"
	"log/slog"
	"net/http"

	"erp-backend/internal/api/response"
	"erp-backend/internal/domain"

	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
)

const (
	PgErrUniqueViolation     = "23505"
	PgErrForeignKeyViolation = "23503"
	PgErrCheckViolation      = "23514"
	PgErrNotNullViolation    = "23502"
)

// HandleDBError tự động phân tích mã lỗi PostgreSQL, Domain Validation Error hoặc standard Go errors
func HandleDBError(c *gin.Context, err error, entityName string) {
	if err == nil {
		return
	}

	// 1. Lỗi vi phạm quy tắc nghiệp vụ Domain (400 Bad Request)
	var valErr *domain.ValidationError
	if errors.As(err, &valErr) {
		response.BadRequest(c, valErr.Error(), nil)
		return
	}

	// 2. Không tìm thấy bản ghi (404 Not Found)
	if errors.Is(err, pgx.ErrNoRows) {
		msg := fmt.Sprintf("Không tìm thấy %s trong hệ thống", entityName)
		response.NotFound(c, msg)
		return
	}

	// 3. Lỗi từ PostgreSQL Engine (pgconn.PgError)
	var pgErr *pgconn.PgError
	if errors.As(err, &pgErr) {
		slog.WarnContext(c.Request.Context(), "PostgreSQL Error Detected",
			slog.String("code", pgErr.Code),
			slog.String("message", pgErr.Message),
			slog.String("detail", pgErr.Detail),
			slog.String("constraint", pgErr.ConstraintName),
			slog.String("entity", entityName),
		)

		switch pgErr.Code {
		case PgErrUniqueViolation:
			msg := fmt.Sprintf("Xung đột dữ liệu: %s đã tồn tại (trùng mã hoặc định danh duy nhất)", entityName)
			if pgErr.Detail != "" {
				msg = fmt.Sprintf("Xung đột: %s", pgErr.Detail)
			}
			response.Error(c, http.StatusConflict, msg, pgErr.Detail)
			return

		case PgErrForeignKeyViolation:
			msg := fmt.Sprintf("Dữ liệu liên kết không hợp lệ: %s liên kết tới bản ghi không tồn tại", entityName)
			if pgErr.Detail != "" {
				msg = fmt.Sprintf("Lỗi liên kết: %s", pgErr.Detail)
			}
			response.BadRequest(c, msg, pgErr.Detail)
			return

		case PgErrCheckViolation:
			msg := fmt.Sprintf("Dữ liệu không thỏa mãn điều kiện ràng buộc của %s", entityName)
			response.BadRequest(c, msg, pgErr.Message)
			return

		case PgErrNotNullViolation:
			msg := fmt.Sprintf("Thiếu trường dữ liệu bắt buộc trong %s", entityName)
			response.BadRequest(c, msg, pgErr.ColumnName)
			return
		}
	}

	// 4. Lỗi hệ thống nội bộ (500 Internal Server Error)
	slog.ErrorContext(c.Request.Context(), "Unhandled Database Error",
		slog.String("entity", entityName),
		slog.String("error", err.Error()),
	)
	response.InternalServerError(c, fmt.Sprintf("Lỗi xử lý dữ liệu %s", entityName), err.Error())
}
