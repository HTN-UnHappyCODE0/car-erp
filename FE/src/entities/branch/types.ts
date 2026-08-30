export interface Branch {
  id: string;
  name: string;
  code: string;
  address?: string | null;
  tax_code?: string | null;
  phone?: string | null;
  status: string;
  created_at: string;
}

export interface CreateBranchDTO {
  name: string;
  code: string;
  address?: string;
  tax_code?: string;
  phone?: string;
}
