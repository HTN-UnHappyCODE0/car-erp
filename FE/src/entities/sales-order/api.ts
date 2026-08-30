import { axiosClient } from '@/shared/api/axios-client';
import { ApiResponse } from '@/shared/types/api';
import {
  SalesOrder,
  ListSalesOrdersParams,
  CreateSalesOrderDTO,
  UpdateSalesOrderStatusDTO,
  CancelSalesOrderDTO,
} from './types';

export const salesOrderApi = {
  list: async (params?: ListSalesOrdersParams): Promise<SalesOrder[]> => {
    const res: ApiResponse<SalesOrder[]> = await axiosClient.get('/sales-orders', { params });
    return res.data || [];
  },

  getById: async (id: string): Promise<SalesOrder> => {
    const res: ApiResponse<SalesOrder> = await axiosClient.get(`/sales-orders/${id}`);
    if (!res.data) throw new Error('Không tìm thấy đơn bán xe');
    return res.data;
  },

  create: async (data: CreateSalesOrderDTO): Promise<SalesOrder> => {
    const res: ApiResponse<SalesOrder> = await axiosClient.post('/sales-orders', data);
    if (!res.data) throw new Error('Lỗi lên đơn bán xe');
    return res.data;
  },

  updateStatus: async (id: string, data: UpdateSalesOrderStatusDTO): Promise<SalesOrder> => {
    const res: ApiResponse<SalesOrder> = await axiosClient.patch(`/sales-orders/${id}/status`, data);
    if (!res.data) throw new Error('Lỗi chuyển trạng thái đơn hàng');
    return res.data;
  },

  cancel: async (id: string, data: CancelSalesOrderDTO): Promise<SalesOrder> => {
    const res: ApiResponse<SalesOrder> = await axiosClient.post(`/sales-orders/${id}/cancel`, data);
    if (!res.data) throw new Error('Lỗi hủy đơn bán xe');
    return res.data;
  },
};
