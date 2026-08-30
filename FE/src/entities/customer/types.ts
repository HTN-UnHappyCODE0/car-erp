export type CustomerType = 'INDIVIDUAL' | 'ENTERPRISE';

export interface Customer {
  id: string;
  type: CustomerType;
  name: string;
  phone: string;
  email?: string | null;
  id_card_number?: string | null;
  address?: string | null;
  created_at: string;
}

export interface ListCustomersParams {
  page_id?: number;
  page_size?: number;
  search?: string;
}

export interface CreateCustomerDTO {
  type?: CustomerType;
  name: string;
  phone: string;
  email?: string;
  id_card_number?: string;
  address?: string;
}

export interface UpdateCustomerDTO {
  type?: CustomerType;
  name?: string;
  phone?: string;
  email?: string;
  id_card_number?: string;
  address?: string;
}
