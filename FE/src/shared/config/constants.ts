export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/api/v1';

export const STORAGE_KEYS = {
  UI_PREFERENCES: 'car-erp-ui-storage',
  AUTH_SESSION: 'car-erp-auth-storage',
  ACCESS_TOKEN: 'car-erp-access-token',
  REFRESH_TOKEN: 'car-erp-refresh-token',
};

export const QUERY_KEYS = {
  AUTH: {
    ME: ['auth', 'me'] as const,
  },
  BRANCHES: {
    ALL: ['branches'] as const,
    DETAIL: (id: string) => ['branches', id] as const,
  },
  VEHICLES: {
    ALL: (params?: unknown) => ['vehicles', params] as const,
    DETAIL: (id: string) => ['vehicles', 'detail', id] as const,
    BY_VIN: (vin: string) => ['vehicles', 'vin', vin] as const,
  },
  VEHICLE_MODELS: {
    ALL: ['vehicle-models'] as const,
    DETAIL: (id: string) => ['vehicle-models', id] as const,
  },
  CUSTOMERS: {
    ALL: (params?: unknown) => ['customers', params] as const,
    DETAIL: (id: string) => ['customers', id] as const,
    BY_PHONE: (phone: string) => ['customers', 'phone', phone] as const,
  },
  LEADS: {
    ALL: (params?: unknown) => ['leads', params] as const,
    DETAIL: (id: string) => ['leads', id] as const,
  },
  SALES_ORDERS: {
    ALL: (params?: unknown) => ['sales-orders', params] as const,
    DETAIL: (id: string) => ['sales-orders', id] as const,
  },
  INVOICES: {
    ALL: (params?: unknown) => ['invoices', params] as const,
    DETAIL: (id: string) => ['invoices', id] as const,
  },
  TRANSACTIONS: {
    ALL: (params?: unknown) => ['transactions', params] as const,
  },
  REPAIR_ORDERS: {
    ALL: (params?: unknown) => ['repair-orders', params] as const,
    DETAIL: (id: string) => ['repair-orders', id] as const,
    VEHICLE_HISTORY: (vehicleId: string) => ['repair-orders', 'history', vehicleId] as const,
  },
};
