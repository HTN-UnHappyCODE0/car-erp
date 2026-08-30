-- name: CreateBranch :one
INSERT INTO branches (
    name,
    code,
    address,
    tax_code,
    phone,
    status
) VALUES (
    $1, $2, $3, $4, $5, $6
) RETURNING *;

-- name: GetBranch :one
SELECT * FROM branches
WHERE id = $1 LIMIT 1;

-- name: GetBranchByCode :one
SELECT * FROM branches
WHERE code = $1 LIMIT 1;

-- name: ListBranches :many
SELECT * FROM branches
ORDER BY created_at DESC
LIMIT $1 OFFSET $2;

-- name: UpdateBranch :one
UPDATE branches
SET
    name = COALESCE($2, name),
    address = COALESCE($3, address),
    tax_code = COALESCE($4, tax_code),
    phone = COALESCE($5, phone),
    status = COALESCE($6, status)
WHERE id = $1
RETURNING *;

-- name: DeleteBranch :exec
DELETE FROM branches
WHERE id = $1;
