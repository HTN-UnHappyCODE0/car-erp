import { axiosClient } from '@/shared/api/axios-client';
import { ApiResponse } from '@/shared/types/api';
import {
  Customer,
  ListCustomersParams,
  CreateCustomerDTO,
  UpdateCustomerDTO,
} from './types';
import { Lead } from '@/entities/lead';

export const customerApi = {
  list: async (params?: ListCustomersParams): Promise<Customer[]> => {
    const res: ApiResponse<Customer[]> = await axiosClient.get('/customers', { params });
    return res.data || [];
  },

  getById: async (id: string): Promise<Customer> => {
    const res: ApiResponse<{ customer: Customer; leads?: Lead[] }> = await axiosClient.get(`/customers/${id}`);
    if (!res.data?.customer) throw new Error('Không tìm thấy khách hàng');
    return res.data.customer;
  },

  getByPhone: async (phone: string): Promise<Customer> => {
    const res: ApiResponse<Customer> = await axiosClient.get(`/customers/phone/${phone}`);
    if (!res.data) throw new Error('Không tìm thấy khách hàng theo số điện thoại');
    return res.data;
  },

  create: async (data: CreateCustomerDTO): Promise<Customer> => {
    const res: ApiResponse<Customer> = await axiosClient.post('/customers', data);
    if (!res.data) throw new Error('Lỗi tạo hồ sơ khách hàng');
    return res.data;
  },

  update: async (id: string, data: UpdateCustomerDTO): Promise<Customer> => {
    const res: ApiResponse<Customer> = await axiosClient.patch(`/customers/${id}`, data);
    if (!res.data) throw new Error('Lỗi cập nhật thông tin khách hàng');
    return res.data;
  },
};
