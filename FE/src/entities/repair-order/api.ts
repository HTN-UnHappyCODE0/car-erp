import { axiosClient } from '@/shared/api/axios-client';
import { ApiResponse } from '@/shared/types/api';
import {
  RepairOrder,
  RepairOrderItem,
  ListRepairOrdersParams,
  CreateRepairOrderDTO,
  UpdateRepairOrderStatusDTO,
  AssignMechanicDTO,
  AddRepairOrderItemDTO,
} from './types';
import { Invoice } from '@/entities/invoice';

export const repairOrderApi = {
  list: async (params?: ListRepairOrdersParams): Promise<RepairOrder[]> => {
    const res: ApiResponse<RepairOrder[]> = await axiosClient.get('/repair-orders', { params });
    return res.data || [];
  },

  getById: async (id: string): Promise<RepairOrder> => {
    const res: ApiResponse<{ repair_order: RepairOrder; items: RepairOrderItem[] }> =
      await axiosClient.get(`/repair-orders/${id}`);
    if (!res.data?.repair_order) throw new Error('Không tìm thấy lệnh sửa chữa');
    return {
      ...res.data.repair_order,
      items: res.data.items || [],
    };
  },

  getVehicleHistory: async (vehicleId: string): Promise<RepairOrder[]> => {
    const res: ApiResponse<RepairOrder[]> = await axiosClient.get(
      `/repair-orders/vehicle/${vehicleId}/history`
    );
    return res.data || [];
  },

  create: async (data: CreateRepairOrderDTO): Promise<RepairOrder> => {
    const res: ApiResponse<RepairOrder> = await axiosClient.post('/repair-orders', data);
    if (!res.data) throw new Error('Lỗi tiếp nhận xe vào xưởng');
    return res.data;
  },

  updateStatus: async (id: string, data: UpdateRepairOrderStatusDTO): Promise<RepairOrder> => {
    const res: ApiResponse<RepairOrder> = await axiosClient.patch(
      `/repair-orders/${id}/status`,
      data
    );
    if (!res.data) throw new Error('Lỗi cập nhật tiến độ sửa chữa');
    return res.data;
  },

  assignMechanic: async (id: string, data: AssignMechanicDTO): Promise<RepairOrder> => {
    const res: ApiResponse<RepairOrder> = await axiosClient.patch(
      `/repair-orders/${id}/assign-mechanic`,
      data
    );
    if (!res.data) throw new Error('Lỗi phân công thợ sửa');
    return res.data;
  },

  addItem: async (
    id: string,
    data: AddRepairOrderItemDTO
  ): Promise<{ item: RepairOrderItem; total_cost: string }> => {
    const res: ApiResponse<{ item: RepairOrderItem; total_cost: string }> =
      await axiosClient.post(`/repair-orders/${id}/items`, data);
    if (!res.data) throw new Error('Lỗi thêm vật tư/công thợ');
    return res.data;
  },

  deleteItem: async (id: string, itemId: string): Promise<{ total_cost: string }> => {
    const res: ApiResponse<{ total_cost: string }> = await axiosClient.delete(
      `/repair-orders/${id}/items/${itemId}`
    );
    if (!res.data) throw new Error('Lỗi xóa vật tư/công thợ');
    return res.data;
  },

  createInvoice: async (id: string): Promise<Invoice> => {
    const res: ApiResponse<Invoice> = await axiosClient.post(`/repair-orders/${id}/invoice`);
    if (!res.data) throw new Error('Lỗi xuất hóa đơn dịch vụ');
    return res.data;
  },
};
