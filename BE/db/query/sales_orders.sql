-- name: CreateSalesOrder :one
INSERT INTO sales_orders (
    branch_id,
    customer_id,
    salesperson_id,
    vehicle_id,
    total_amount,
    discount_amount,
    deposit_amount,
    status
) VALUES (
    $1, $2, $3, $4, $5, $6, $7, $8
) RETURNING *;

-- name: GetSalesOrder :one
SELECT * FROM sales_orders
WHERE id = $1 LIMIT 1;

-- name: GetSalesOrderForUpdate :one
SELECT * FROM sales_orders
WHERE id = $1 LIMIT 1
FOR UPDATE;

-- name: GetSalesOrderByVehicleID :one
SELECT * FROM sales_orders
WHERE vehicle_id = $1 LIMIT 1;

-- name: ListSalesOrders :many
SELECT * FROM sales_orders
ORDER BY created_at DESC
LIMIT $1 OFFSET $2;

-- name: ListSalesOrdersByStatus :many
SELECT * FROM sales_orders
WHERE status = $1
ORDER BY created_at DESC
LIMIT $2 OFFSET $3;

-- name: ListSalesOrdersByCustomer :many
SELECT * FROM sales_orders
WHERE customer_id = $1
ORDER BY created_at DESC;

-- name: ListSalesOrdersBySalesperson :many
SELECT * FROM sales_orders
WHERE salesperson_id = $1
ORDER BY created_at DESC
LIMIT $2 OFFSET $3;

-- name: UpdateSalesOrderStatus :one
UPDATE sales_orders
SET
    status = $2,
    updated_at = CURRENT_TIMESTAMP
WHERE id = $1
RETURNING *;

-- name: UpdateSalesOrderDeposit :one
UPDATE sales_orders
SET
    deposit_amount = $2,
    status = $3,
    updated_at = CURRENT_TIMESTAMP
WHERE id = $1
RETURNING *;

-- name: CancelSalesOrder :one
UPDATE sales_orders
SET
    status = 'CANCELLED',
    cancel_reason = $2,
    deposit_resolution = $3,
    cancelled_by = $4,
    cancelled_at = CURRENT_TIMESTAMP,
    updated_at = CURRENT_TIMESTAMP
WHERE id = $1
RETURNING *;
