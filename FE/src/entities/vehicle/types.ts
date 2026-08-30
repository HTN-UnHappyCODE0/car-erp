export type VehicleStatus =
  | 'IN_TRANSIT'
  | 'IN_STOCK'
  | 'RESERVED'
  | 'SOLD'
  | 'MAINTENANCE';

export interface VehicleModel {
  id: string;
  make: string;
  model: string;
  year: number;
  trim?: string | null;
  specifications?: Record<string, unknown> | null;
  created_at: string;
}

export interface Vehicle {
  id: string;
  branch_id: string;
  model_id: string;
  vin: string;
  engine_number?: string | null;
  color_exterior?: string | null;
  color_interior?: string | null;
  status: VehicleStatus;
  purchase_price: string;
  created_at: string;
  // Thông tin mở rộng khi JOIN
  model?: VehicleModel;
  branch_name?: string;
}

export interface ListVehiclesParams {
  page_id?: number;
  page_size?: number;
  status?: VehicleStatus;
}

export interface CreateVehicleDTO {
  branch_id?: string;
  model_id: string;
  vin: string;
  engine_number?: string;
  color_exterior?: string;
  color_interior?: string;
  status?: VehicleStatus;
  purchase_price: string;
}

export interface TransferVehicleDTO {
  to_branch_id: string;
}

export interface CreateVehicleModelDTO {
  make: string;
  model: string;
  year: number;
  trim?: string;
  specifications?: Record<string, unknown>;
}
