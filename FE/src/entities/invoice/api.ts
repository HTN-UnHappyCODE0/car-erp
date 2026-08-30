import { axiosClient } from '@/shared/api/axios-client';
import { ApiResponse } from '@/shared/types/api';
import {
  Invoice,
  Transaction,
  ListInvoicesParams,
  ListTransactionsParams,
  CreateInvoiceDTO,
  CreatePaymentDTO,
} from './types';

export const invoiceApi = {
  listInvoices: async (params?: ListInvoicesParams): Promise<Invoice[]> => {
    const res: ApiResponse<Invoice[]> = await axiosClient.get('/invoices', { params });
    return res.data || [];
  },

  getInvoiceById: async (id: string): Promise<Invoice> => {
    const res: ApiResponse<Invoice> = await axiosClient.get(`/invoices/${id}`);
    if (!res.data) throw new Error('Không tìm thấy hóa đơn');
    return res.data;
  },

  createInvoice: async (data: CreateInvoiceDTO): Promise<Invoice> => {
    const res: ApiResponse<Invoice> = await axiosClient.post('/invoices', data);
    if (!res.data) throw new Error('Lỗi tạo hóa đơn');
    return res.data;
  },

  createPayment: async (
    invoiceId: string,
    data: CreatePaymentDTO
  ): Promise<{ transaction: Transaction; invoice: Invoice }> => {
    const res: ApiResponse<{ transaction: Transaction; invoice: Invoice }> =
      await axiosClient.post(`/invoices/${invoiceId}/payments`, data);
    if (!res.data) throw new Error('Lỗi ghi nhận thanh toán');
    return res.data;
  },

  listTransactions: async (params?: ListTransactionsParams): Promise<Transaction[]> => {
    const res: ApiResponse<Transaction[]> = await axiosClient.get('/transactions', { params });
    return res.data || [];
  },
};
