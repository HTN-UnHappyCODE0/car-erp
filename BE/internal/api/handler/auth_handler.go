package handler

import (
	"errors"
	"net/http"
	"time"

	"erp-backend/db/sqlc"
	"erp-backend/internal/api/middleware"
	"erp-backend/internal/api/response"
	"erp-backend/internal/token"
	"erp-backend/internal/util"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgtype"
)

type AuthHandler struct {
	store                db.Store
	tokenMaker           token.Maker
	accessTokenDuration  time.Duration
	refreshTokenDuration time.Duration
}

func NewAuthHandler(
	store db.Store,
	tokenMaker token.Maker,
	accessTokenDuration time.Duration,
	refreshTokenDuration time.Duration,
) *AuthHandler {
	return &AuthHandler{
		store:                store,
		tokenMaker:           tokenMaker,
		accessTokenDuration:  accessTokenDuration,
		refreshTokenDuration: refreshTokenDuration,
	}
}

type loginRequest struct {
	Username string `json:"username" binding:"required,min=3"`
	Password string `json:"password" binding:"required,min=6"`
}

type loginResponse struct {
	SessionID             uuid.UUID    `json:"session_id"`
	AccessToken           string       `json:"access_token"`
	AccessTokenExpiresAt  time.Time    `json:"access_token_expires_at"`
	RefreshToken          string       `json:"refresh_token"`
	RefreshTokenExpiresAt time.Time    `json:"refresh_token_expires_at"`
	User                  userResponse `json:"user"`
}

type userResponse struct {
	ID         uuid.UUID `json:"id"`
	EmployeeID uuid.UUID `json:"employee_id"`
	Username   string    `json:"username"`
	Role       string    `json:"role"`
	BranchID   uuid.UUID `json:"branch_id"`
	CreatedAt  time.Time `json:"created_at"`
}

// Login xác thực thông tin đăng nhập, tạo phiên (Session) và cấp phát Access Token + Refresh Token
func (h *AuthHandler) Login(c *gin.Context) {
	var req loginRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, "Dữ liệu đăng nhập không hợp lệ", err.Error())
		return
	}

	user, err := h.store.GetUserByUsername(c.Request.Context(), req.Username)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			response.Error(c, http.StatusUnauthorized, "Tên đăng nhập hoặc mật khẩu không chính xác", nil)
			return
		}
		response.InternalServerError(c, "Lỗi truy vấn tài khoản", err.Error())
		return
	}

	if !user.IsActive.Bool {
		response.Forbidden(c, "Tài khoản của bạn đã bị vô hiệu hóa")
		return
	}

	if err := util.CheckPassword(req.Password, user.PasswordHash); err != nil {
		response.Error(c, http.StatusUnauthorized, "Tên đăng nhập hoặc mật khẩu không chính xác", nil)
		return
	}

	// Lấy thông tin nhân viên để xác định branch_id
	employee, err := h.store.GetEmployee(c.Request.Context(), user.EmployeeID)
	if err != nil {
		response.InternalServerError(c, "Không tìm thấy hồ sơ nhân viên", err.Error())
		return
	}

	// 1. Tạo Access Token ngắn hạn (15 phút) mang cả user.ID và user.EmployeeID
	accessToken, accessPayload, err := h.tokenMaker.CreateToken(
		user.ID,
		user.EmployeeID,
		user.Username,
		user.Role,
		employee.BranchID,
		h.accessTokenDuration,
	)
	if err != nil {
		response.InternalServerError(c, "Lỗi tạo Access Token", err.Error())
		return
	}

	// 2. Tạo Refresh Token dài hạn (7 ngày) mang cả user.ID và user.EmployeeID
	refreshToken, refreshPayload, err := h.tokenMaker.CreateToken(
		user.ID,
		user.EmployeeID,
		user.Username,
		user.Role,
		employee.BranchID,
		h.refreshTokenDuration,
	)
	if err != nil {
		response.InternalServerError(c, "Lỗi tạo Refresh Token", err.Error())
		return
	}

	// 3. Lưu phiên đăng nhập vào bảng `sessions` (UserID tham chiếu users.id)
	session, err := h.store.CreateSession(c.Request.Context(), db.CreateSessionParams{
		ID:           refreshPayload.ID,
		UserID:       user.ID,
		RefreshToken: refreshToken,
		UserAgent:    pgtype.Text{String: c.Request.UserAgent(), Valid: true},
		ClientIp:     pgtype.Text{String: c.ClientIP(), Valid: true},
		IsBlocked:    pgtype.Bool{Bool: false, Valid: true},
		ExpiresAt:    pgtype.Timestamptz{Time: refreshPayload.ExpiresAt.Time, Valid: true},
	})
	if err != nil {
		response.InternalServerError(c, "Lỗi lưu phiên đăng nhập", err.Error())
		return
	}

	res := loginResponse{
		SessionID:             session.ID,
		AccessToken:           accessToken,
		AccessTokenExpiresAt:  accessPayload.ExpiresAt.Time,
		RefreshToken:          refreshToken,
		RefreshTokenExpiresAt: refreshPayload.ExpiresAt.Time,
		User: userResponse{
			ID:         user.ID,
			EmployeeID: user.EmployeeID,
			Username:   user.Username,
			Role:       user.Role,
			BranchID:   employee.BranchID,
			CreatedAt:  user.CreatedAt.Time,
		},
	}

	response.Success(c, http.StatusOK, res, "Đăng nhập thành công")
}

type renewAccessTokenRequest struct {
	RefreshToken string `json:"refresh_token" binding:"required"`
}

type renewAccessTokenResponse struct {
	AccessToken          string    `json:"access_token"`
	AccessTokenExpiresAt time.Time `json:"access_token_expires_at"`
}

// RenewAccessToken tự động cấp Access Token mới khi còn Refresh Token hợp lệ (Silent Refresh)
func (h *AuthHandler) RenewAccessToken(c *gin.Context) {
	var req renewAccessTokenRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, "Yêu cầu cung cấp refresh_token hợp lệ", err.Error())
		return
	}

	// 1. Xác thực chữ ký Refresh Token
	refreshPayload, err := h.tokenMaker.VerifyToken(req.RefreshToken)
	if err != nil {
		response.Unauthorized(c, "Refresh Token không hợp lệ hoặc đã hết hạn: "+err.Error())
		return
	}

	// 2. Kiểm tra phiên đăng nhập trong bảng `sessions`
	session, err := h.store.GetSession(c.Request.Context(), refreshPayload.ID)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			response.Unauthorized(c, "Phiên đăng nhập không tồn tại hoặc đã bị xóa")
			return
		}
		response.InternalServerError(c, "Lỗi kiểm tra phiên đăng nhập", err.Error())
		return
	}

	// 3. Kiểm tra tính toàn vẹn và trạng thái khóa
	if session.IsBlocked.Bool {
		response.Forbidden(c, "Phiên đăng nhập này đã bị khóa hoặc thu hồi")
		return
	}

	if session.UserID != refreshPayload.UserID {
		response.Unauthorized(c, "Phiên đăng nhập không thuộc về người dùng này")
		return
	}

	if session.RefreshToken != req.RefreshToken {
		response.Unauthorized(c, "Refresh Token không khớp với phiên hiện tại (phát hiện token gian lận)")
		return
	}

	if time.Now().After(session.ExpiresAt.Time) {
		response.Unauthorized(c, "Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại")
		return
	}

	// 4. Lấy lại thông tin quyền và chi nhánh mới nhất của User
	user, err := h.store.GetUserByID(c.Request.Context(), session.UserID)
	if err != nil {
		response.InternalServerError(c, "Lỗi truy vấn thông tin tài khoản", err.Error())
		return
	}

	if !user.IsActive.Bool {
		response.Forbidden(c, "Tài khoản của bạn đã bị vô hiệu hóa")
		return
	}

	employee, err := h.store.GetEmployee(c.Request.Context(), user.EmployeeID)
	if err != nil {
		response.InternalServerError(c, "Lỗi truy vấn hồ sơ nhân viên", err.Error())
		return
	}

	// 5. Cấp phát Access Token mới (15 phút) mang cả user.ID và user.EmployeeID
	accessToken, accessPayload, err := h.tokenMaker.CreateToken(
		user.ID,
		user.EmployeeID,
		user.Username,
		user.Role,
		employee.BranchID,
		h.accessTokenDuration,
	)
	if err != nil {
		response.InternalServerError(c, "Lỗi tạo Access Token mới", err.Error())
		return
	}

	res := renewAccessTokenResponse{
		AccessToken:          accessToken,
		AccessTokenExpiresAt: accessPayload.ExpiresAt.Time,
	}

	response.Success(c, http.StatusOK, res, "Cấp lại Access Token thành công")
}

type logoutRequest struct {
	SessionID *string `json:"session_id"`
}

// Logout vô hiệu hóa phiên đăng nhập hiện tại
func (h *AuthHandler) Logout(c *gin.Context) {
	var req logoutRequest
	_ = c.ShouldBindJSON(&req)

	if req.SessionID != nil {
		sessionID, err := uuid.Parse(*req.SessionID)
		if err == nil {
			_, _ = h.store.BlockSession(c.Request.Context(), sessionID)
		}
	}

	response.Success(c, http.StatusOK, nil, "Đăng xuất thành công")
}

// GetMe trả về thông tin người dùng đang đăng nhập
func (h *AuthHandler) GetMe(c *gin.Context) {
	payload, ok := middleware.GetAuthPayload(c)
	if !ok || payload == nil {
		response.Unauthorized(c, "Yêu cầu đăng nhập")
		return
	}

	user, err := h.store.GetUserByID(c.Request.Context(), payload.UserID)
	if err != nil {
		response.NotFound(c, "Không tìm thấy thông tin tài khoản")
		return
	}

	res := userResponse{
		ID:         user.ID,
		EmployeeID: user.EmployeeID,
		Username:   user.Username,
		Role:       user.Role,
		BranchID:   payload.BranchID,
		CreatedAt:  user.CreatedAt.Time,
	}

	response.Success(c, http.StatusOK, res, "Lấy thông tin tài khoản thành công")
}
