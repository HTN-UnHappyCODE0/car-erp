-- name: CreateRepairOrderItem :one
INSERT INTO repair_order_items (
    repair_order_id,
    item_type,
    item_name,
    quantity,
    unit_price,
    part_id
) VALUES (
    $1, $2, $3, $4, $5, $6
) RETURNING *;

-- name: GetRepairOrderItem :one
SELECT * FROM repair_order_items
WHERE id = $1 LIMIT 1;

-- name: ListRepairOrderItemsByOrder :many
SELECT * FROM repair_order_items
WHERE repair_order_id = $1
ORDER BY item_name ASC;

-- name: DeleteRepairOrderItem :exec
DELETE FROM repair_order_items
WHERE id = $1;
