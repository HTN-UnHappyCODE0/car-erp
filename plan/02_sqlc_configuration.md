# Kế Hoạch 02: Cấu Hình sqlc & Sinh Mã Nguồn Tự Động cho Database Layer

## 1. Tổng Quan & Mục Tiêu
- **Mục tiêu**: Thiết lập công cụ `sqlc` (version 2) nhằm tự động sinh Go code Type-Safe cho tầng truy cập dữ liệu (Data Access Layer) từ các câu lệnh SQL thuần.
- **Engine**: PostgreSQL.
- **Driver / SQL Package**: `pgx/v5` (`github.com/jackc/pgx/v5`).
- **Data Types Mapping**: Ánh xạ kiểu `UUID` trong PostgreSQL trực tiếp sang `github.com/google/uuid.UUID`.

---

## 2. Cấu Trúc Thư Mục & File Cấu Hình

```
BE/
├── sqlc.yaml                  # Cấu hình chính của sqlc
├── db/
│   ├── migration/             # Thư mục chứa các file .up.sql / .down.sql (Schema)
│   ├── query/                 # Thư mục chứa các file .sql thuần cho nghiệp vụ
│   │   ├── branches.sql
│   │   ├── departments.sql
│   │   ├── employees.sql
│   │   ├── users.sql
│   │   ├── vehicle_models.sql
│   │   ├── vehicles.sql
│   │   ├── campaigns.sql
│   │   ├── customers.sql
│   │   ├── leads.sql
│   │   ├── sales_orders.sql
│   │   ├── contracts.sql
│   │   ├── invoices.sql
│   │   ├── transactions.sql
│   │   ├── repair_orders.sql
│   │   └── repair_order_items.sql
│   └── sqlc/                  # Go code được sqlc tự động sinh (Models, Querier, Queries)
```

---

## 3. Nội Dung Cấu Hình `sqlc.yaml`
```yaml
version: "2"
sql:
  - engine: "postgresql"
    schema: "db/migration"
    queries: "db/query"
    gen:
      go:
        package: "db"
        out: "db/sqlc"
        sql_package: "pgx/v5"
        emit_json_tags: true
        emit_interface: true
        emit_exact_table_names: false
        emit_empty_slices: true
        overrides:
          - db_type: "uuid"
            go_type: "github.com/google/uuid.UUID"
```

---

## 4. Các Lệnh Thao Tác
- **Sinh Go code**:
  ```bash
  cd BE
  sqlc generate
  ```
- **Kiểm tra biên dịch**:
  ```bash
  cd BE
  go build ./...
  ```
