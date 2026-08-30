import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { QUERY_KEYS } from '@/shared/config/constants';
import { branchApi } from './api';
import { CreateBranchDTO } from './types';

export const branchQueries = {
  all: () => ({
    queryKey: QUERY_KEYS.BRANCHES.ALL,
    queryFn: () => branchApi.list(),
  }),
  detail: (id: string) => ({
    queryKey: QUERY_KEYS.BRANCHES.DETAIL(id),
    queryFn: () => branchApi.getById(id),
    enabled: Boolean(id),
  }),
};

export function useBranches() {
  return useQuery(branchQueries.all());
}

export function useBranch(id: string) {
  return useQuery(branchQueries.detail(id));
}

export function useCreateBranch() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateBranchDTO) => branchApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.BRANCHES.ALL });
    },
  });
}
