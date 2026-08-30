export type OrderStatus =
  | 'DRAFT'
  | 'DEPOSIT_PAID'
  | 'FULL_PAID'
  | 'DELIVERED'
  | 'CANCELLED';

export type DepositResolution =
  | 'NONE'
  | 'FORFEITED'
  | 'PENDING_REFUND'
  | 'CREDITED'
  | 'REFUNDED';

export interface SalesOrder {
  id: string;
  branch_id: string;
  customer_id: string;
  salesperson_id: string;
  vehicle_id: string;
  total_amount: string;
  discount_amount?: string | null;
  deposit_amount?: string | null;
  status: OrderStatus;
  created_at: string;
  updated_at: string;
  cancel_reason?: string | null;
  deposit_resolution?: DepositResolution | null;
  cancelled_by?: string | null;
  cancelled_at?: string | null;
  // Joins
  customer_name?: string;
  customer_phone?: string;
  vehicle_vin?: string;
  vehicle_model?: string;
  salesperson_name?: string;
}

export interface ListSalesOrdersParams {
  page_id?: number;
  page_size?: number;
  status?: OrderStatus;
  salesperson_id?: string;
}

export interface CreateSalesOrderDTO {
  customer_id: string;
  vehicle_id: string;
  total_amount: string;
  discount_amount?: string;
  deposit_amount?: string;
  lead_id?: string;
}

export interface UpdateSalesOrderStatusDTO {
  status: 'DEPOSIT_PAID' | 'FULL_PAID' | 'DELIVERED';
  deposit_amount?: string;
}

export interface CancelSalesOrderDTO {
  cancel_reason: string;
  deposit_resolution: DepositResolution;
}
