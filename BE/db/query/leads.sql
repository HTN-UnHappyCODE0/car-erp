-- name: CreateLead :one
INSERT INTO leads (
    branch_id,
    customer_id,
    campaign_id,
    assigned_to,
    interested_model_id,
    status,
    notes
) VALUES (
    $1, $2, $3, $4, $5, $6, $7
) RETURNING *;

-- name: GetLead :one
SELECT * FROM leads
WHERE id = $1 LIMIT 1;

-- name: ListLeads :many
SELECT * FROM leads
ORDER BY created_at DESC
LIMIT $1 OFFSET $2;

-- name: ListLeadsByStatus :many
SELECT * FROM leads
WHERE status = $1
ORDER BY created_at DESC
LIMIT $2 OFFSET $3;

-- name: ListLeadsByCustomer :many
SELECT * FROM leads
WHERE customer_id = $1
ORDER BY created_at DESC;

-- name: ListLeadsByEmployee :many
SELECT * FROM leads
WHERE assigned_to = $1
ORDER BY created_at DESC
LIMIT $2 OFFSET $3;

-- name: UpdateLeadStatus :one
UPDATE leads
SET
    status = $2,
    notes = COALESCE($3, notes)
WHERE id = $1
RETURNING *;

-- name: AssignLead :one
UPDATE leads
SET
    assigned_to = $2
WHERE id = $1
RETURNING *;
