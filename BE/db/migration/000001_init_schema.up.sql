-- Extension for UUID generation
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. Quản lý chi nhánh / đại lý
CREATE TABLE branches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    code VARCHAR(50) UNIQUE NOT NULL, -- VD: CN-HN01, CN-HCM02
    address TEXT,
    tax_code VARCHAR(50),
    phone VARCHAR(20),
    status VARCHAR(50) DEFAULT 'ACTIVE',
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 2. Phòng ban
CREATE TABLE departments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL -- Sales, Service, Finance, Marketing, HR
);

-- 3. Nhân sự
CREATE TABLE employees (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    branch_id UUID NOT NULL REFERENCES branches(id),
    department_id UUID NOT NULL REFERENCES departments(id),
    full_name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    phone VARCHAR(20),
    position VARCHAR(100),
    hire_date DATE,
    status VARCHAR(50) DEFAULT 'ACTIVE',
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 4. Tài khoản người dùng (RBAC)
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id UUID UNIQUE NOT NULL REFERENCES employees(id),
    username VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL, -- superadmin, branch_manager, salesperson, accountant, mechanic
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 5. Danh mục dòng xe (Thông số từ nhà sản xuất)
CREATE TABLE vehicle_models (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    make VARCHAR(100) NOT NULL, -- Toyota, Hyundai, VinFast...
    model VARCHAR(100) NOT NULL, -- Camry, Tucson, VF8...
    year INT NOT NULL,
    trim VARCHAR(100), -- 2.5Q, Tiêu chuẩn, Plus...
    specifications JSONB DEFAULT '{}', -- Dung tích động cơ, hộp số, options...
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 6. Xe thực tế trong kho (Định danh theo VIN duy nhất)
CREATE TABLE vehicles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    branch_id UUID NOT NULL REFERENCES branches(id),
    model_id UUID NOT NULL REFERENCES vehicle_models(id),
    vin VARCHAR(17) UNIQUE NOT NULL, -- Số khung (Vehicle Identification Number)
    engine_number VARCHAR(100), -- Số máy
    color_exterior VARCHAR(50),
    color_interior VARCHAR(50),
    status VARCHAR(50) NOT NULL, -- IN_TRANSIT, IN_STOCK, RESERVED, SOLD, MAINTENANCE
    purchase_price NUMERIC(15, 2) NOT NULL, -- Giá nhập từ hãng
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_vehicles_branch_status ON vehicles(branch_id, status);
CREATE INDEX idx_vehicles_specs ON vehicle_models USING GIN (specifications);

-- 7. Chiến dịch Marketing
CREATE TABLE campaigns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    budget NUMERIC(15, 2) NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    platform VARCHAR(50), -- Facebook, Google, Showroom Event, Referral
    status VARCHAR(50) DEFAULT 'ACTIVE'
);

-- 8. Khách hàng
CREATE TABLE customers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type VARCHAR(20) DEFAULT 'INDIVIDUAL', -- INDIVIDUAL hoặc ENTERPRISE
    name VARCHAR(255) NOT NULL,
    phone VARCHAR(20) UNIQUE NOT NULL,
    email VARCHAR(255),
    id_card_number VARCHAR(50), -- CCCD / Mã số thuế công ty
    address TEXT,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 9. Cơ hội bán hàng (Leads)
CREATE TABLE leads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    branch_id UUID NOT NULL REFERENCES branches(id),
    customer_id UUID NOT NULL REFERENCES customers(id),
    campaign_id UUID REFERENCES campaigns(id),
    assigned_to UUID REFERENCES employees(id), -- Nhân viên Sales phụ trách
    interested_model_id UUID REFERENCES vehicle_models(id),
    status VARCHAR(50) NOT NULL, -- NEW, CONTACTED, TEST_DRIVE, QUOTED, WON, LOST
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 10. Đơn đặt hàng xe
CREATE TABLE sales_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    branch_id UUID NOT NULL REFERENCES branches(id),
    customer_id UUID NOT NULL REFERENCES customers(id),
    salesperson_id UUID NOT NULL REFERENCES employees(id),
    vehicle_id UUID UNIQUE NOT NULL REFERENCES vehicles(id), -- Mỗi đơn gắn cố định 1 số VIN
    total_amount NUMERIC(15, 2) NOT NULL,
    discount_amount NUMERIC(15, 2) DEFAULT 0,
    deposit_amount NUMERIC(15, 2) DEFAULT 0,
    status VARCHAR(50) NOT NULL, -- DRAFT, DEPOSIT_PAID, FULL_PAID, DELIVERED, CANCELLED
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 11. Hợp đồng pháp lý
CREATE TABLE contracts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID UNIQUE NOT NULL REFERENCES sales_orders(id),
    contract_number VARCHAR(100) UNIQUE NOT NULL,
    signed_date DATE NOT NULL,
    file_url TEXT, -- Đường dẫn lưu trữ file PDF trên AWS S3
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 12. Hóa đơn
CREATE TABLE invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    branch_id UUID NOT NULL REFERENCES branches(id),
    order_id UUID REFERENCES sales_orders(id),
    repair_order_id UUID, -- Liên kết với đơn sửa chữa (Service) nếu có
    invoice_number VARCHAR(100) UNIQUE NOT NULL,
    amount NUMERIC(15, 2) NOT NULL,
    due_date DATE NOT NULL,
    status VARCHAR(50) DEFAULT 'UNPAID', -- UNPAID, PARTIAL, PAID, OVERDUE
    issued_date TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 13. Giao dịch thanh toán (Dòng tiền thực tế)
CREATE TABLE transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    branch_id UUID NOT NULL REFERENCES branches(id),
    invoice_id UUID NOT NULL REFERENCES invoices(id),
    payment_method VARCHAR(50) NOT NULL, -- CASH, BANK_TRANSFER, INSTALLMENT (Trả góp)
    amount NUMERIC(15, 2) NOT NULL,
    transaction_date TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(50) DEFAULT 'COMPLETED',
    note TEXT
);

CREATE INDEX idx_transactions_branch ON transactions(branch_id, transaction_date);

-- 14. Lệnh sửa chữa / Bảo dưỡng
CREATE TABLE repair_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    branch_id UUID NOT NULL REFERENCES branches(id),
    customer_id UUID NOT NULL REFERENCES customers(id),
    vehicle_id UUID NOT NULL REFERENCES vehicles(id),
    service_advisor_id UUID NOT NULL REFERENCES employees(id), -- Cố vấn dịch vụ
    mechanic_id UUID REFERENCES employees(id), -- Kỹ thuật viên chính
    odometer INT NOT NULL, -- Số KM hiện tại (Dữ liệu vàng cho AI)
    symptoms TEXT, -- Yêu cầu/Hiện trạng xe từ khách
    diagnosis TEXT, -- Chẩn đoán của kỹ thuật
    total_cost NUMERIC(15, 2) DEFAULT 0,
    status VARCHAR(50) NOT NULL, -- OPEN, IN_PROGRESS, COMPLETED, INVOICED
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 15. Chi tiết linh kiện và công thợ
CREATE TABLE repair_order_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    repair_order_id UUID NOT NULL REFERENCES repair_orders(id) ON DELETE CASCADE,
    item_type VARCHAR(20) NOT NULL, -- PART (Linh kiện) hoặc LABOR (Công thợ)
    item_name VARCHAR(255) NOT NULL,
    quantity INT NOT NULL DEFAULT 1,
    unit_price NUMERIC(15, 2) NOT NULL,
    subtotal NUMERIC(15, 2) GENERATED ALWAYS AS (quantity * unit_price) STORED
);
