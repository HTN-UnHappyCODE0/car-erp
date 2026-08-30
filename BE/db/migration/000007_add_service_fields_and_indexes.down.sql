DROP INDEX IF EXISTS idx_invoices_repair_order_branch;
DROP INDEX IF EXISTS idx_repair_order_items_order;
DROP INDEX IF EXISTS idx_repair_orders_branch_status;
DROP INDEX IF EXISTS idx_repair_orders_vehicle_created;

ALTER TABLE repair_order_items DROP COLUMN IF EXISTS part_id;
ALTER TABLE repair_orders DROP COLUMN IF EXISTS odometer_override_reason;
