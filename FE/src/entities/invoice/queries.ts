import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { QUERY_KEYS } from '@/shared/config/constants';
import { invoiceApi } from './api';
import {
  ListInvoicesParams,
  ListTransactionsParams,
  CreateInvoiceDTO,
  CreatePaymentDTO,
} from './types';

export const invoiceQueries = {
  list: (params?: ListInvoicesParams) => ({
    queryKey: QUERY_KEYS.INVOICES.ALL(params),
    queryFn: () => invoiceApi.listInvoices(params),
  }),
  detail: (id: string) => ({
    queryKey: QUERY_KEYS.INVOICES.DETAIL(id),
    queryFn: () => invoiceApi.getInvoiceById(id),
    enabled: Boolean(id),
  }),
  transactions: (params?: ListTransactionsParams) => ({
    queryKey: QUERY_KEYS.TRANSACTIONS.ALL(params),
    queryFn: () => invoiceApi.listTransactions(params),
  }),
};

export function useInvoices(params?: ListInvoicesParams) {
  return useQuery(invoiceQueries.list(params));
}

export function useInvoice(id: string) {
  return useQuery(invoiceQueries.detail(id));
}

export function useTransactions(params?: ListTransactionsParams) {
  return useQuery(invoiceQueries.transactions(params));
}

export function useCreateInvoice() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateInvoiceDTO) => invoiceApi.createInvoice(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
    },
  });
}

export function useCreatePayment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ invoiceId, data }: { invoiceId: string; data: CreatePaymentDTO }) =>
      invoiceApi.createPayment(invoiceId, data),
    onSuccess: (_, { invoiceId }) => {
      // 2. Cross-Module Cache Invalidation: Đồng bộ tức thì tới toàn bộ hệ thống
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.INVOICES.DETAIL(invoiceId) });
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['sales-orders'] });
      queryClient.invalidateQueries({ queryKey: ['repair-orders'] });
      queryClient.invalidateQueries({ queryKey: ['vehicles'] });
    },
  });
}
