export type LeadStatus =
  | 'NEW'
  | 'CONTACTED'
  | 'TEST_DRIVE'
  | 'QUOTED'
  | 'WON'
  | 'LOST';

// Ma trận chuyển trạng thái chuẩn State Machine phễu bán lẻ ô tô
export const VALID_LEAD_TRANSITIONS: Record<LeadStatus, LeadStatus[]> = {
  NEW: ['CONTACTED', 'LOST'],
  CONTACTED: ['TEST_DRIVE', 'QUOTED', 'LOST'],
  TEST_DRIVE: ['QUOTED', 'LOST'],
  QUOTED: ['WON', 'LOST'],
  WON: [], // Đã chốt cọc thành công -> chuyển sang Sales Order
  LOST: ['NEW'], // Khách quay lại -> Tái kích hoạt
};

export const isValidLeadTransition = (from: LeadStatus, to: LeadStatus): boolean => {
  if (from === to) return true;
  return VALID_LEAD_TRANSITIONS[from]?.includes(to) ?? false;
};

export interface Lead {
  id: string;
  branch_id: string;
  customer_id: string;
  campaign_id?: string | null;
  assigned_to?: string | null;
  interested_model_id?: string | null;
  status: LeadStatus;
  notes?: string | null;
  lost_reason?: string | null;
  created_at: string;
  // Join expansion
  customer_name?: string;
  customer_phone?: string;
  salesperson_name?: string;
  model_name?: string;
}

export interface ListLeadsParams {
  page_id?: number;
  page_size?: number;
  status?: LeadStatus;
  search?: string;
}

export interface CreateLeadDTO {
  customer_id?: string;
  customer_name?: string;
  customer_phone?: string;
  campaign_id?: string;
  assigned_to?: string;
  interested_model_id?: string;
  notes?: string;
}

export interface UpdateLeadStatusDTO {
  status: LeadStatus;
  notes?: string;
  lost_reason?: string;
}

export interface AssignLeadDTO {
  assigned_to: string;
}
