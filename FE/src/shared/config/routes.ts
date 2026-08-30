export type UserRole =
  | 'superadmin'
  | 'branch_manager'
  | 'salesperson'
  | 'accountant'
  | 'mechanic';

export interface NavItem {
  title: string;
  href: string;
  iconName: string;
  roles?: UserRole[];
  badge?: string;
}

export const APP_ROUTES = {
  LOGIN: '/login',
  DASHBOARD: '/',
  INVENTORY: '/inventory',
  CRM: '/crm',
  SALES: '/sales',
  SERVICE: '/service',
  FINANCE: '/finance',
  SETTINGS: '/settings',
};

export const NAV_ITEMS: NavItem[] = [
  {
    title: 'Tổng Quan',
    href: APP_ROUTES.DASHBOARD,
    iconName: 'LayoutDashboard',
    roles: ['superadmin', 'branch_manager', 'salesperson', 'accountant', 'mechanic'],
  },
  {
    title: 'Kho Xe & Danh Mục',
    href: APP_ROUTES.INVENTORY,
    iconName: 'Car',
    roles: ['superadmin', 'branch_manager', 'salesperson', 'mechanic'],
  },
  {
    title: 'Khách Hàng & Leads',
    href: APP_ROUTES.CRM,
    iconName: 'Users',
    roles: ['superadmin', 'branch_manager', 'salesperson'],
  },
  {
    title: 'Đơn Bán Xe',
    href: APP_ROUTES.SALES,
    iconName: 'ShoppingBag',
    roles: ['superadmin', 'branch_manager', 'salesperson', 'accountant'],
  },
  {
    title: 'Xưởng Dịch Vụ',
    href: APP_ROUTES.SERVICE,
    iconName: 'Wrench',
    roles: ['superadmin', 'branch_manager', 'mechanic', 'salesperson'],
  },
  {
    title: 'Tài Chính & Hóa Đơn',
    href: APP_ROUTES.FINANCE,
    iconName: 'Receipt',
    roles: ['superadmin', 'branch_manager', 'accountant'],
  },
  {
    title: 'Cài Đặt Hệ Thống',
    href: APP_ROUTES.SETTINGS,
    iconName: 'Settings',
    roles: ['superadmin', 'branch_manager'],
  },
];
