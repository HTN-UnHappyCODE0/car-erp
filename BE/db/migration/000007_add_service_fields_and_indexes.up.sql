-- 1. Thêm cột odometer_override_reason vào bảng repair_orders
ALTER TABLE repair_orders
ADD COLUMN IF NOT EXISTS odometer_override_reason TEXT;

-- 2. Thêm cột part_id vào bảng repair_order_items (dự phòng kho phụ tùng tương lai)
ALTER TABLE repair_order_items
ADD COLUMN IF NOT EXISTS part_id UUID;

-- 3. Composite Indexes tối ưu truy vấn cho Service & AI
CREATE INDEX IF NOT EXISTS idx_repair_orders_vehicle_created ON repair_orders(vehicle_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_repair_orders_branch_status ON repair_orders(branch_id, status);
CREATE INDEX IF NOT EXISTS idx_repair_order_items_order ON repair_order_items(repair_order_id);
CREATE INDEX IF NOT EXISTS idx_invoices_repair_order_branch ON invoices(repair_order_id, branch_id);
