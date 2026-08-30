import { axiosClient } from '@/shared/api/axios-client';
import { ApiResponse } from '@/shared/types/api';
import { Branch, CreateBranchDTO } from './types';

export const branchApi = {
  list: async (): Promise<Branch[]> => {
    const res: ApiResponse<Branch[]> = await axiosClient.get('/branches');
    return res.data || [];
  },

  getById: async (id: string): Promise<Branch> => {
    const res: ApiResponse<Branch> = await axiosClient.get(`/branches/${id}`);
    if (!res.data) throw new Error('Không tìm thấy chi nhánh');
    return res.data;
  },

  create: async (data: CreateBranchDTO): Promise<Branch> => {
    const res: ApiResponse<Branch> = await axiosClient.post('/branches', data);
    if (!res.data) throw new Error('Lỗi tạo chi nhánh');
    return res.data;
  },
};
