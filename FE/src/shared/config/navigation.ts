export type UserRole =
  | 'superadmin'
  | 'branch_manager'
  | 'salesperson'
  | 'mechanic'
  | 'accountant';

export interface NavItem {
  title: string;
  href: string;
  iconName: string;
  allowedRoles: UserRole[];
  badge?: string;
  description?: string;
}

export const NAVIGATION_ITEMS: NavItem[] = [
  {
    title: 'Tổng Quan',
    href: '/',
    iconName: 'LayoutDashboard',
    allowedRoles: ['superadmin', 'branch_manager', 'salesperson', 'mechanic', 'accountant'],
    description: 'Bảng điều hành & Chỉ số KPI doanh nghiệp',
  },
  {
    title: 'Kho Xe & Mẫu Xe',
    href: '/inventory',
    iconName: 'Car',
    allowedRoles: ['superadmin', 'branch_manager', 'salesperson', 'mechanic'],
    description: 'Quản lý số khung VIN, model xe và điều chuyển kho',
  },
  {
    title: 'Khách Hàng & Leads',
    href: '/crm',
    iconName: 'Users',
    allowedRoles: ['superadmin', 'branch_manager', 'salesperson'],
    description: 'Hồ sơ khách hàng và phễu cơ hội bán hàng',
  },
  {
    title: 'Hợp Đồng Bán Xe',
    href: '/sales',
    iconName: 'ShoppingBag',
    allowedRoles: ['superadmin', 'branch_manager', 'salesperson'],
    badge: 'State Machine',
    description: 'Quy trình ký hợp đồng bán xe và xử lý cọc',
  },
  {
    title: 'Xưởng Dịch Vụ',
    href: '/service',
    iconName: 'Wrench',
    allowedRoles: ['superadmin', 'branch_manager', 'mechanic'],
    description: 'Tiếp nhận xe, kiểm tra ODO và kê khai vật tư sửa chữa',
  },
  {
    title: 'Tài Chính & Dòng Tiền',
    href: '/finance',
    iconName: 'Receipt',
    allowedRoles: ['superadmin', 'branch_manager', 'accountant'],
    description: 'Quản lý hóa đơn thu tiền và sổ cái giao dịch',
  },
  {
    title: 'Cài Đặt Chi Nhánh',
    href: '/settings',
    iconName: 'Settings',
    allowedRoles: ['superadmin', 'branch_manager'],
    description: 'Quản lý showroom chi nhánh và phân quyền tài khoản',
  },
];
