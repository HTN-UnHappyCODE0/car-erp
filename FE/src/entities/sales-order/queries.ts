import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { QUERY_KEYS } from '@/shared/config/constants';
import { salesOrderApi } from './api';
import {
  ListSalesOrdersParams,
  CreateSalesOrderDTO,
  UpdateSalesOrderStatusDTO,
  CancelSalesOrderDTO,
} from './types';

export const salesOrderQueries = {
  list: (params?: ListSalesOrdersParams) => ({
    queryKey: QUERY_KEYS.SALES_ORDERS.ALL(params),
    queryFn: () => salesOrderApi.list(params),
  }),
  detail: (id: string) => ({
    queryKey: QUERY_KEYS.SALES_ORDERS.DETAIL(id),
    queryFn: () => salesOrderApi.getById(id),
    enabled: Boolean(id),
  }),
};

export function useSalesOrders(params?: ListSalesOrdersParams) {
  return useQuery(salesOrderQueries.list(params));
}

export function useSalesOrder(id: string) {
  return useQuery(salesOrderQueries.detail(id));
}

export function useCreateSalesOrder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateSalesOrderDTO) => salesOrderApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sales-orders'] });
      queryClient.invalidateQueries({ queryKey: ['vehicles'] });
      queryClient.invalidateQueries({ queryKey: ['leads'] });
    },
  });
}

export function useUpdateSalesOrderStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateSalesOrderStatusDTO }) =>
      salesOrderApi.updateStatus(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['sales-orders'] });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.SALES_ORDERS.DETAIL(id) });
      queryClient.invalidateQueries({ queryKey: ['vehicles'] });
    },
  });
}

export function useCancelSalesOrder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: CancelSalesOrderDTO }) =>
      salesOrderApi.cancel(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['sales-orders'] });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.SALES_ORDERS.DETAIL(id) });
      queryClient.invalidateQueries({ queryKey: ['vehicles'] });
    },
  });
}
