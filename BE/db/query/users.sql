-- name: CreateUser :one
INSERT INTO users (
    employee_id,
    username,
    password_hash,
    role,
    is_active
) VALUES (
    $1, $2, $3, $4, $5
) RETURNING *;

-- name: GetUserByID :one
SELECT * FROM users
WHERE id = $1 LIMIT 1;

-- name: GetUserByUsername :one
SELECT * FROM users
WHERE username = $1 LIMIT 1;

-- name: GetUserByEmployeeID :one
SELECT * FROM users
WHERE employee_id = $1 LIMIT 1;

-- name: UpdateUserPassword :one
UPDATE users
SET password_hash = $2
WHERE id = $1
RETURNING *;

-- name: UpdateUserStatus :one
UPDATE users
SET is_active = $2
WHERE id = $1
RETURNING *;
