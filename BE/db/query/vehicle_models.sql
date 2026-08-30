-- name: CreateVehicleModel :one
INSERT INTO vehicle_models (
    make,
    model,
    year,
    trim,
    specifications
) VALUES (
    $1, $2, $3, $4, $5
) RETURNING *;

-- name: GetVehicleModel :one
SELECT * FROM vehicle_models
WHERE id = $1 LIMIT 1;

-- name: ListVehicleModels :many
SELECT * FROM vehicle_models
ORDER BY make ASC, model ASC, year DESC
LIMIT $1 OFFSET $2;

-- name: ListVehicleModelsByMake :many
SELECT * FROM vehicle_models
WHERE make ILIKE $1
ORDER BY model ASC, year DESC
LIMIT $2 OFFSET $3;

-- name: UpdateVehicleModel :one
UPDATE vehicle_models
SET
    make = COALESCE($2, make),
    model = COALESCE($3, model),
    year = COALESCE($4, year),
    trim = COALESCE($5, trim),
    specifications = COALESCE($6, specifications)
WHERE id = $1
RETURNING *;

-- name: DeleteVehicleModel :exec
DELETE FROM vehicle_models
WHERE id = $1;
