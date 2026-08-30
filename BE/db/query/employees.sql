-- name: CreateEmployee :one
INSERT INTO employees (
    branch_id,
    department_id,
    full_name,
    email,
    phone,
    position,
    hire_date,
    status
) VALUES (
    $1, $2, $3, $4, $5, $6, $7, $8
) RETURNING *;

-- name: GetEmployee :one
SELECT * FROM employees
WHERE id = $1 LIMIT 1;

-- name: GetEmployeeByEmail :one
SELECT * FROM employees
WHERE email = $1 LIMIT 1;

-- name: ListEmployeesByBranch :many
SELECT * FROM employees
WHERE branch_id = $1
ORDER BY created_at DESC
LIMIT $2 OFFSET $3;

-- name: UpdateEmployee :one
UPDATE employees
SET
    branch_id = COALESCE($2, branch_id),
    department_id = COALESCE($3, department_id),
    full_name = COALESCE($4, full_name),
    phone = COALESCE($5, phone),
    position = COALESCE($6, position),
    status = COALESCE($7, status)
WHERE id = $1
RETURNING *;

-- name: DeleteEmployee :exec
DELETE FROM employees
WHERE id = $1;
