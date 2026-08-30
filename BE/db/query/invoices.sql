-- name: CreateInvoice :one
INSERT INTO invoices (
    branch_id,
    order_id,
    repair_order_id,
    invoice_number,
    amount,
    due_date,
    status
) VALUES (
    $1, $2, $3, $4, $5, $6, $7
) RETURNING *;

-- name: GetInvoice :one
SELECT * FROM invoices
WHERE id = $1 LIMIT 1;

-- name: GetInvoiceForUpdate :one
SELECT * FROM invoices
WHERE id = $1 LIMIT 1
FOR UPDATE;

-- name: ListInvoices :many
SELECT * FROM invoices
ORDER BY issued_date DESC
LIMIT $1 OFFSET $2;

-- name: ListInvoicesByStatus :many
SELECT * FROM invoices
WHERE status = $1
ORDER BY issued_date DESC
LIMIT $2 OFFSET $3;

-- name: ListInvoicesByOrder :many
SELECT * FROM invoices
WHERE order_id = $1
ORDER BY issued_date ASC;

-- name: UpdateInvoiceStatus :one
UPDATE invoices
SET status = $2
WHERE id = $1
RETURNING *;

-- name: GetTotalPaidForInvoice :one
SELECT COALESCE(SUM(amount), 0)::NUMERIC(15,2) AS total_paid
FROM transactions
WHERE invoice_id = $1
  AND branch_id = $2
  AND status = 'COMPLETED';
