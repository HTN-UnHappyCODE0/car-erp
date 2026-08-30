-- name: CreateRepairOrder :one
INSERT INTO repair_orders (
    branch_id,
    customer_id,
    vehicle_id,
    service_advisor_id,
    mechanic_id,
    odometer,
    symptoms,
    diagnosis,
    total_cost,
    status,
    odometer_override_reason
) VALUES (
    $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11
) RETURNING *;

-- name: GetRepairOrder :one
SELECT * FROM repair_orders
WHERE id = $1 LIMIT 1;

-- name: GetRepairOrderForUpdate :one
SELECT * FROM repair_orders
WHERE id = $1 LIMIT 1
FOR UPDATE;

-- name: GetLatestOdometerForVehicle :one
SELECT odometer FROM repair_orders
WHERE vehicle_id = $1
ORDER BY created_at DESC
LIMIT 1;

-- name: ListRepairOrders :many
SELECT * FROM repair_orders
ORDER BY created_at DESC
LIMIT $1 OFFSET $2;

-- name: ListRepairOrdersByStatus :many
SELECT * FROM repair_orders
WHERE status = $1
ORDER BY created_at DESC
LIMIT $2 OFFSET $3;

-- name: ListRepairOrdersByVehicle :many
SELECT * FROM repair_orders
WHERE vehicle_id = $1
ORDER BY created_at DESC
LIMIT $2 OFFSET $3;

-- name: UpdateRepairOrderStatus :one
UPDATE repair_orders
SET
    status = $2,
    diagnosis = COALESCE($3, diagnosis)
WHERE id = $1
RETURNING *;

-- name: AssignMechanic :one
UPDATE repair_orders
SET mechanic_id = $2
WHERE id = $1
RETURNING *;

-- name: RecalculateRepairOrderTotalCost :one
UPDATE repair_orders
SET total_cost = (
    SELECT COALESCE(SUM(subtotal), 0)::NUMERIC(15, 2)
    FROM repair_order_items
    WHERE repair_order_id = $1
)
WHERE id = $1
RETURNING *;
