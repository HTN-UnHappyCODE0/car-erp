DROP POLICY IF EXISTS repair_orders_branch_isolation_policy ON repair_orders;
ALTER TABLE repair_orders NO FORCE ROW LEVEL SECURITY;
ALTER TABLE repair_orders DISABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS transactions_branch_isolation_policy ON transactions;
ALTER TABLE transactions NO FORCE ROW LEVEL SECURITY;
ALTER TABLE transactions DISABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS invoices_branch_isolation_policy ON invoices;
ALTER TABLE invoices NO FORCE ROW LEVEL SECURITY;
ALTER TABLE invoices DISABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS sales_orders_branch_isolation_policy ON sales_orders;
ALTER TABLE sales_orders NO FORCE ROW LEVEL SECURITY;
ALTER TABLE sales_orders DISABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS leads_branch_isolation_policy ON leads;
ALTER TABLE leads NO FORCE ROW LEVEL SECURITY;
ALTER TABLE leads DISABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS vehicles_branch_isolation_policy ON vehicles;
ALTER TABLE vehicles NO FORCE ROW LEVEL SECURITY;
ALTER TABLE vehicles DISABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS employees_branch_isolation_policy ON employees;
ALTER TABLE employees NO FORCE ROW LEVEL SECURITY;
ALTER TABLE employees DISABLE ROW LEVEL SECURITY;
