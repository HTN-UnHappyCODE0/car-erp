import { axiosClient } from '@/shared/api/axios-client';
import { ApiResponse } from '@/shared/types/api';
import {
  Lead,
  ListLeadsParams,
  CreateLeadDTO,
  UpdateLeadStatusDTO,
  AssignLeadDTO,
} from './types';

export const leadApi = {
  list: async (params?: ListLeadsParams): Promise<Lead[]> => {
    const res: ApiResponse<Lead[]> = await axiosClient.get('/leads', { params });
    return res.data || [];
  },

  getById: async (id: string): Promise<Lead> => {
    const res: ApiResponse<Lead> = await axiosClient.get(`/leads/${id}`);
    if (!res.data) throw new Error('Không tìm thấy cơ hội bán hàng');
    return res.data;
  },

  create: async (data: CreateLeadDTO): Promise<Lead> => {
    const res: ApiResponse<Lead> = await axiosClient.post('/leads', data);
    if (!res.data) throw new Error('Lỗi tạo cơ hội bán hàng');
    return res.data;
  },

  updateStatus: async (id: string, data: UpdateLeadStatusDTO): Promise<Lead> => {
    const res: ApiResponse<Lead> = await axiosClient.patch(`/leads/${id}/status`, data);
    if (!res.data) throw new Error('Lỗi cập nhật trạng thái Lead');
    return res.data;
  },

  assign: async (id: string, data: AssignLeadDTO): Promise<Lead> => {
    const res: ApiResponse<Lead> = await axiosClient.patch(`/leads/${id}/assign`, data);
    if (!res.data) throw new Error('Lỗi phân bổ Lead');
    return res.data;
  },
};
