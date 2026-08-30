-- name: CreateContract :one
INSERT INTO contracts (
    order_id,
    contract_number,
    signed_date,
    file_url
) VALUES (
    $1, $2, $3, $4
) RETURNING *;

-- name: GetContractByOrder :one
SELECT * FROM contracts
WHERE order_id = $1 LIMIT 1;
