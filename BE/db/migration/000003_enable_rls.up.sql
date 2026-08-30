-- Tạo role ứng dụng không có quyền bypass RLS
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'erp_app') THEN
        CREATE ROLE erp_app WITH NOSUPERUSER NOBYPASSRLS;
    END IF;
END $$;

GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO erp_app;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO erp_app;
GRANT USAGE ON SCHEMA public TO erp_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO erp_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO erp_app;

-- 1. employees
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE employees FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS employees_branch_isolation_policy ON employees;
CREATE POLICY employees_branch_isolation_policy ON employees
    FOR ALL
    TO erp_app, erp_admin, public
    USING (
        current_setting('app.current_user_role', true) = 'superadmin'
        OR branch_id = NULLIF(current_setting('app.current_branch_id', true), '')::uuid
    )
    WITH CHECK (
        current_setting('app.current_user_role', true) = 'superadmin'
        OR branch_id = NULLIF(current_setting('app.current_branch_id', true), '')::uuid
    );

-- 2. vehicles
ALTER TABLE vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE vehicles FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS vehicles_branch_isolation_policy ON vehicles;
CREATE POLICY vehicles_branch_isolation_policy ON vehicles
    FOR ALL
    TO erp_app, erp_admin, public
    USING (
        current_setting('app.current_user_role', true) = 'superadmin'
        OR branch_id = NULLIF(current_setting('app.current_branch_id', true), '')::uuid
    )
    WITH CHECK (
        current_setting('app.current_user_role', true) = 'superadmin'
        OR branch_id = NULLIF(current_setting('app.current_branch_id', true), '')::uuid
    );

-- 3. leads
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE leads FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS leads_branch_isolation_policy ON leads;
CREATE POLICY leads_branch_isolation_policy ON leads
    FOR ALL
    TO erp_app, erp_admin, public
    USING (
        current_setting('app.current_user_role', true) = 'superadmin'
        OR branch_id = NULLIF(current_setting('app.current_branch_id', true), '')::uuid
    )
    WITH CHECK (
        current_setting('app.current_user_role', true) = 'superadmin'
        OR branch_id = NULLIF(current_setting('app.current_branch_id', true), '')::uuid
    );

-- 4. sales_orders
ALTER TABLE sales_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales_orders FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS sales_orders_branch_isolation_policy ON sales_orders;
CREATE POLICY sales_orders_branch_isolation_policy ON sales_orders
    FOR ALL
    TO erp_app, erp_admin, public
    USING (
        current_setting('app.current_user_role', true) = 'superadmin'
        OR branch_id = NULLIF(current_setting('app.current_branch_id', true), '')::uuid
    )
    WITH CHECK (
        current_setting('app.current_user_role', true) = 'superadmin'
        OR branch_id = NULLIF(current_setting('app.current_branch_id', true), '')::uuid
    );

-- 5. invoices
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS invoices_branch_isolation_policy ON invoices;
CREATE POLICY invoices_branch_isolation_policy ON invoices
    FOR ALL
    TO erp_app, erp_admin, public
    USING (
        current_setting('app.current_user_role', true) = 'superadmin'
        OR branch_id = NULLIF(current_setting('app.current_branch_id', true), '')::uuid
    )
    WITH CHECK (
        current_setting('app.current_user_role', true) = 'superadmin'
        OR branch_id = NULLIF(current_setting('app.current_branch_id', true), '')::uuid
    );

-- 6. transactions
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS transactions_branch_isolation_policy ON transactions;
CREATE POLICY transactions_branch_isolation_policy ON transactions
    FOR ALL
    TO erp_app, erp_admin, public
    USING (
        current_setting('app.current_user_role', true) = 'superadmin'
        OR branch_id = NULLIF(current_setting('app.current_branch_id', true), '')::uuid
    )
    WITH CHECK (
        current_setting('app.current_user_role', true) = 'superadmin'
        OR branch_id = NULLIF(current_setting('app.current_branch_id', true), '')::uuid
    );

-- 7. repair_orders
ALTER TABLE repair_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE repair_orders FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS repair_orders_branch_isolation_policy ON repair_orders;
CREATE POLICY repair_orders_branch_isolation_policy ON repair_orders
    FOR ALL
    TO erp_app, erp_admin, public
    USING (
        current_setting('app.current_user_role', true) = 'superadmin'
        OR branch_id = NULLIF(current_setting('app.current_branch_id', true), '')::uuid
    )
    WITH CHECK (
        current_setting('app.current_user_role', true) = 'superadmin'
        OR branch_id = NULLIF(current_setting('app.current_branch_id', true), '')::uuid
    );
