import { axiosClient } from '@/shared/api/axios-client';
import { ApiResponse } from '@/shared/types/api';
import { User } from './types';

export const userApi = {
  getMe: async (): Promise<User> => {
    const res: ApiResponse<User> = await axiosClient.get('/auth/me');
    if (!res.data) throw new Error('Không tìm thấy thông tin tài khoản');
    return res.data;
  },
};
