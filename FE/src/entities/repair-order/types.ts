export type RepairOrderStatus = 'OPEN' | 'IN_PROGRESS' | 'COMPLETED' | 'INVOICED';
export type RepairItemType = 'PART' | 'LABOR';

export interface RepairOrderItem {
  id: string;
  repair_order_id: string;
  item_type: RepairItemType;
  item_name: string;
  quantity: number;
  unit_price: string;
  subtotal: string;
  part_id?: string | null;
}

export interface RepairOrder {
  id: string;
  branch_id: string;
  customer_id: string;
  vehicle_id: string;
  service_advisor_id: string;
  mechanic_id?: string | null;
  odometer: number;
  symptoms?: string | null;
  diagnosis?: string | null;
  total_cost: string;
  status: RepairOrderStatus;
  created_at: string;
  odometer_override_reason?: string | null;
  // Joins
  customer_name?: string;
  customer_phone?: string;
  vehicle_vin?: string;
  mechanic_name?: string;
  items?: RepairOrderItem[];
}

export interface ListRepairOrdersParams {
  page_id?: number;
  page_size?: number;
  status?: RepairOrderStatus;
  vehicle_id?: string;
}

export interface CreateRepairOrderDTO {
  customer_id: string;
  vehicle_id: string;
  mechanic_id?: string;
  odometer: number;
  symptoms: string;
  diagnosis?: string;
  override_odometer?: boolean;
  override_reason?: string;
}

export interface UpdateRepairOrderStatusDTO {
  status: RepairOrderStatus;
  diagnosis?: string;
}

export interface AssignMechanicDTO {
  mechanic_id: string;
}

export interface AddRepairOrderItemDTO {
  item_type: RepairItemType;
  item_name: string;
  quantity: number;
  unit_price: string;
  part_id?: string;
}
