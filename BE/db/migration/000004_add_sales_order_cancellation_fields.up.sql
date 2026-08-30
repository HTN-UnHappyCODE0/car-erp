ALTER TABLE sales_orders
ADD COLUMN cancel_reason TEXT,
ADD COLUMN deposit_resolution VARCHAR(50),
ADD COLUMN cancelled_by UUID REFERENCES employees(id),
ADD COLUMN cancelled_at TIMESTAMPTZ;
