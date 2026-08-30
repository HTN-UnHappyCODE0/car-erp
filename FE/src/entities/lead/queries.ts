import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { QUERY_KEYS } from '@/shared/config/constants';
import { leadApi } from './api';
import { ListLeadsParams, CreateLeadDTO, UpdateLeadStatusDTO, AssignLeadDTO } from './types';

export const leadQueries = {
  list: (params?: ListLeadsParams) => ({
    queryKey: QUERY_KEYS.LEADS.ALL(params),
    queryFn: () => leadApi.list(params),
  }),
  detail: (id: string) => ({
    queryKey: QUERY_KEYS.LEADS.DETAIL(id),
    queryFn: () => leadApi.getById(id),
    enabled: Boolean(id),
  }),
};

export function useLeads(params?: ListLeadsParams) {
  return useQuery(leadQueries.list(params));
}

export function useLead(id: string) {
  return useQuery(leadQueries.detail(id));
}

export function useCreateLead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateLeadDTO) => leadApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
    },
  });
}

export function useUpdateLeadStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateLeadStatusDTO }) =>
      leadApi.updateStatus(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.LEADS.DETAIL(id) });
    },
  });
}

export function useAssignLead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: AssignLeadDTO }) =>
      leadApi.assign(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.LEADS.DETAIL(id) });
    },
  });
}
