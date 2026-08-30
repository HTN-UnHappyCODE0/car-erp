export type InvoiceStatus = 'UNPAID' | 'PARTIAL' | 'PAID' | 'OVERDUE';
export type PaymentMethod = 'CASH' | 'BANK_TRANSFER' | 'INSTALLMENT';
export type TransactionStatus = 'COMPLETED' | 'FAILED' | 'REFUNDED';

export interface Invoice {
  id: string;
  branch_id: string;
  order_id?: string | null;
  repair_order_id?: string | null;
  invoice_number: string;
  amount: string;
  due_date: string;
  status: InvoiceStatus;
  issued_date: string;
  // Joins
  transactions?: Transaction[];
}

export interface Transaction {
  id: string;
  branch_id: string;
  invoice_id: string;
  payment_method: PaymentMethod;
  amount: string;
  transaction_date: string;
  status: TransactionStatus;
  note?: string | null;
  reference_code?: string | null;
}

export interface ListInvoicesParams {
  page_id?: number;
  page_size?: number;
  status?: InvoiceStatus;
  order_id?: string;
}

export interface ListTransactionsParams {
  page_id?: number;
  page_size?: number;
  invoice_id?: string;
}

export interface CreateInvoiceDTO {
  order_id?: string;
  repair_order_id?: string;
  invoice_number: string;
  amount: string;
  due_date: string;
}

export interface CreatePaymentDTO {
  payment_method: PaymentMethod;
  amount: string;
  reference_code?: string;
  note?: string;
}
