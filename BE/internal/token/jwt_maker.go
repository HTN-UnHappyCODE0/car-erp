package token

import (
	"errors"
	"fmt"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
)

const minSecretKeySize = 32

// JWTMaker là struct triển khai Maker sử dụng thuật toán JSON Web Token (JWT)
type JWTMaker struct {
	secretKey string
}

// NewJWTMaker khởi tạo JWTMaker với secretKey
func NewJWTMaker(secretKey string) (Maker, error) {
	if len(secretKey) < minSecretKeySize {
		return nil, fmt.Errorf("độ dài secret key phải tối thiểu %d ký tự", minSecretKeySize)
	}
	return &JWTMaker{secretKey: secretKey}, nil
}

// CreateToken tạo token JWT mới với HMAC-SHA256
func (maker *JWTMaker) CreateToken(userID, employeeID uuid.UUID, username, role string, branchID uuid.UUID, duration time.Duration) (string, *Payload, error) {
	payload, err := NewPayload(userID, employeeID, username, role, branchID, duration)
	if err != nil {
		return "", nil, err
	}

	jwtToken := jwt.NewWithClaims(jwt.SigningMethodHS256, payload)
	tokenString, err := jwtToken.SignedString([]byte(maker.secretKey))
	return tokenString, payload, err
}

// VerifyToken xác thực chữ ký token và thời hạn
func (maker *JWTMaker) VerifyToken(tokenString string) (*Payload, error) {
	keyFunc := func(token *jwt.Token) (interface{}, error) {
		_, ok := token.Method.(*jwt.SigningMethodHMAC)
		if !ok {
			return nil, ErrInvalidToken
		}
		return []byte(maker.secretKey), nil
	}

	jwtToken, err := jwt.ParseWithClaims(tokenString, &Payload{}, keyFunc)
	if err != nil {
		if errors.Is(err, jwt.ErrTokenExpired) {
			return nil, ErrExpiredToken
		}
		return nil, ErrInvalidToken
	}

	payload, ok := jwtToken.Claims.(*Payload)
	if !ok {
		return nil, ErrInvalidToken
	}

	return payload, nil
}
