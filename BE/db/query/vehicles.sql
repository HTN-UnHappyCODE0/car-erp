-- name: CreateVehicle :one
INSERT INTO vehicles (
    branch_id,
    model_id,
    vin,
    engine_number,
    color_exterior,
    color_interior,
    status,
    purchase_price
) VALUES (
    $1, $2, $3, $4, $5, $6, $7, $8
) RETURNING *;

-- name: GetVehicle :one
SELECT * FROM vehicles
WHERE id = $1 LIMIT 1;

-- name: GetVehicleForUpdate :one
SELECT * FROM vehicles
WHERE id = $1 LIMIT 1
FOR UPDATE;

-- name: GetVehicleByVIN :one
SELECT * FROM vehicles
WHERE vin = $1 LIMIT 1;

-- name: ListVehicles :many
SELECT * FROM vehicles
ORDER BY created_at DESC
LIMIT $1 OFFSET $2;

-- name: ListVehiclesByStatus :many
SELECT * FROM vehicles
WHERE status = $1
ORDER BY created_at DESC
LIMIT $2 OFFSET $3;

-- name: ListVehiclesByBranch :many
SELECT * FROM vehicles
WHERE branch_id = $1
ORDER BY created_at DESC
LIMIT $2 OFFSET $3;

-- name: ListVehiclesByBranchAndStatus :many
SELECT * FROM vehicles
WHERE branch_id = $1 AND status = $2
ORDER BY created_at DESC
LIMIT $3 OFFSET $4;

-- name: UpdateVehicleStatus :one
UPDATE vehicles
SET status = $2
WHERE id = $1
RETURNING *;

-- name: UpdateVehicleDetails :one
UPDATE vehicles
SET
    engine_number = COALESCE($2, engine_number),
    color_exterior = COALESCE($3, color_exterior),
    color_interior = COALESCE($4, color_interior),
    purchase_price = COALESCE($5, purchase_price)
WHERE id = $1
RETURNING *;

-- name: TransferVehicleBranch :one
UPDATE vehicles
SET
    branch_id = $2,
    status = 'IN_TRANSIT'
WHERE id = $1
RETURNING *;

-- name: DeleteVehicle :exec
DELETE FROM vehicles
WHERE id = $1;
