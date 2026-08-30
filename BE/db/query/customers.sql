-- name: CreateCustomer :one
INSERT INTO customers (
    type,
    name,
    phone,
    email,
    id_card_number,
    address
) VALUES (
    $1, $2, $3, $4, $5, $6
) RETURNING *;

-- name: GetCustomer :one
SELECT * FROM customers
WHERE id = $1 LIMIT 1;

-- name: GetCustomerByPhone :one
SELECT * FROM customers
WHERE phone = $1 LIMIT 1;

-- name: ListCustomers :many
SELECT * FROM customers
ORDER BY created_at DESC
LIMIT $1 OFFSET $2;

-- name: SearchCustomers :many
SELECT * FROM customers
WHERE name ILIKE $1 OR phone ILIKE $1 OR id_card_number ILIKE $1
ORDER BY created_at DESC
LIMIT $2 OFFSET $3;

-- name: UpdateCustomer :one
UPDATE customers
SET
    type = COALESCE($2, type),
    name = COALESCE($3, name),
    phone = COALESCE($4, phone),
    email = COALESCE($5, email),
    id_card_number = COALESCE($6, id_card_number),
    address = COALESCE($7, address)
WHERE id = $1
RETURNING *;
