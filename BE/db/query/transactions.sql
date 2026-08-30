-- name: CreateTransaction :one
INSERT INTO transactions (
    branch_id,
    invoice_id,
    payment_method,
    amount,
    status,
    note,
    reference_code
) VALUES (
    $1, $2, $3, $4, $5, $6, $7
) RETURNING *;

-- name: GetTransaction :one
SELECT * FROM transactions
WHERE id = $1 LIMIT 1;

-- name: GetTransactionByReferenceCode :one
SELECT * FROM transactions
WHERE reference_code = $1 LIMIT 1;

-- name: ListTransactions :many
SELECT * FROM transactions
ORDER BY transaction_date DESC
LIMIT $1 OFFSET $2;

-- name: ListTransactionsByInvoice :many
SELECT * FROM transactions
WHERE invoice_id = $1
ORDER BY transaction_date DESC;

-- name: GetTotalPaidForOrder :one
SELECT COALESCE(SUM(t.amount), 0)::NUMERIC(15,2) AS total_paid
FROM transactions t
JOIN invoices i ON t.invoice_id = i.id
WHERE i.order_id = $1
  AND i.branch_id = $2
  AND t.branch_id = $2
  AND t.status = 'COMPLETED';
