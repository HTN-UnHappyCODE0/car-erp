ALTER TABLE sales_orders
DROP COLUMN IF EXISTS cancelled_at,
DROP COLUMN IF EXISTS cancelled_by,
DROP COLUMN IF EXISTS deposit_resolution,
DROP COLUMN IF EXISTS cancel_reason;
