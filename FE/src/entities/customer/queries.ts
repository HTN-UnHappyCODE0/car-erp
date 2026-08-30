import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { QUERY_KEYS } from '@/shared/config/constants';
import { customerApi } from './api';
import { ListCustomersParams, CreateCustomerDTO, UpdateCustomerDTO } from './types';

export const customerQueries = {
  list: (params?: ListCustomersParams) => ({
    queryKey: QUERY_KEYS.CUSTOMERS.ALL(params),
    queryFn: () => customerApi.list(params),
  }),
  detail: (id: string) => ({
    queryKey: QUERY_KEYS.CUSTOMERS.DETAIL(id),
    queryFn: () => customerApi.getById(id),
    enabled: Boolean(id),
  }),
  byPhone: (phone: string) => ({
    queryKey: QUERY_KEYS.CUSTOMERS.BY_PHONE(phone),
    queryFn: () => customerApi.getByPhone(phone),
    enabled: Boolean(phone && phone.length >= 8),
  }),
};

export function useCustomers(params?: ListCustomersParams) {
  return useQuery(customerQueries.list(params));
}

export function useCustomer(id: string) {
  return useQuery(customerQueries.detail(id));
}

export function useCustomerByPhone(phone: string) {
  return useQuery(customerQueries.byPhone(phone));
}

export function useCreateCustomer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateCustomerDTO) => customerApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
    },
  });
}

export function useUpdateCustomer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateCustomerDTO }) =>
      customerApi.update(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.CUSTOMERS.DETAIL(id) });
    },
  });
}
