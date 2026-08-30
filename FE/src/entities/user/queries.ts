import { useQuery } from '@tanstack/react-query';
import { QUERY_KEYS } from '@/shared/config/constants';
import { userApi } from './api';

export const userQueries = {
  me: () => ({
    queryKey: QUERY_KEYS.AUTH.ME,
    queryFn: () => userApi.getMe(),
  }),
};

export function useMe() {
  return useQuery(userQueries.me());
}
