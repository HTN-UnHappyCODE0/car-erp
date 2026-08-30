import { axiosClient } from '@/shared/api/axios-client';
import { ApiResponse } from '@/shared/types/api';
import {
  Vehicle,
  VehicleModel,
  ListVehiclesParams,
  CreateVehicleDTO,
  TransferVehicleDTO,
  CreateVehicleModelDTO,
  VehicleStatus,
} from './types';

export const vehicleApi = {
  listVehicles: async (params?: ListVehiclesParams): Promise<Vehicle[]> => {
    const res: ApiResponse<Vehicle[]> = await axiosClient.get('/vehicles', { params });
    return res.data || [];
  },

  getVehicleById: async (id: string): Promise<Vehicle> => {
    const res: ApiResponse<Vehicle> = await axiosClient.get(`/vehicles/${id}`);
    if (!res.data) throw new Error('Không tìm thấy xe');
    return res.data;
  },

  getVehicleByVin: async (vin: string): Promise<Vehicle> => {
    const res: ApiResponse<Vehicle> = await axiosClient.get(`/vehicles/vin/${vin}`);
    if (!res.data) throw new Error('Không tìm thấy xe theo số VIN');
    return res.data;
  },

  createVehicle: async (data: CreateVehicleDTO): Promise<Vehicle> => {
    const res: ApiResponse<Vehicle> = await axiosClient.post('/vehicles', data);
    if (!res.data) throw new Error('Lỗi nhập xe vào kho');
    return res.data;
  },

  updateVehicleStatus: async (id: string, status: VehicleStatus): Promise<Vehicle> => {
    const res: ApiResponse<Vehicle> = await axiosClient.patch(`/vehicles/${id}/status`, { status });
    if (!res.data) throw new Error('Lỗi cập nhật trạng thái xe');
    return res.data;
  },

  transferVehicle: async (id: string, data: TransferVehicleDTO): Promise<Vehicle> => {
    const res: ApiResponse<Vehicle> = await axiosClient.post(`/vehicles/${id}/transfer`, data);
    if (!res.data) throw new Error('Lỗi điều chuyển xe');
    return res.data;
  },

  // Vehicle Models API
  listModels: async (): Promise<VehicleModel[]> => {
    const res: ApiResponse<VehicleModel[]> = await axiosClient.get('/vehicle-models');
    return res.data || [];
  },

  createModel: async (data: CreateVehicleModelDTO): Promise<VehicleModel> => {
    const res: ApiResponse<VehicleModel> = await axiosClient.post('/vehicle-models', data);
    if (!res.data) throw new Error('Lỗi tạo dòng xe');
    return res.data;
  },
};
