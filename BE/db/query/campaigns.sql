-- name: CreateCampaign :one
INSERT INTO campaigns (
    name,
    budget,
    start_date,
    end_date,
    platform,
    status
) VALUES (
    $1, $2, $3, $4, $5, $6
) RETURNING *;

-- name: GetCampaign :one
SELECT * FROM campaigns
WHERE id = $1 LIMIT 1;

-- name: ListCampaigns :many
SELECT * FROM campaigns
ORDER BY start_date DESC
LIMIT $1 OFFSET $2;
