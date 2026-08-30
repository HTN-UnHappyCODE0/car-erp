-- Thêm các composite index tối ưu hóa cho truy vấn Hóa đơn và Dòng tiền
CREATE INDEX IF NOT EXISTS idx_invoices_order_branch ON invoices(order_id, branch_id);
CREATE INDEX IF NOT EXISTS idx_invoices_branch_status ON invoices(branch_id, status);
CREATE INDEX IF NOT EXISTS idx_transactions_invoice_branch ON transactions(invoice_id, branch_id, status);
