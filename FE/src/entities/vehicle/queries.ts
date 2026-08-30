import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { QUERY_KEYS } from '@/shared/config/constants';
import { vehicleApi } from './api';
import {
  ListVehiclesParams,
  CreateVehicleDTO,
  TransferVehicleDTO,
  VehicleStatus,
  CreateVehicleModelDTO,
} from './types';

export const vehicleQueries = {
  list: (params?: ListVehiclesParams) => ({
    queryKey: QUERY_KEYS.VEHICLES.ALL(params),
    queryFn: () => vehicleApi.listVehicles(params),
  }),
  detail: (id: string) => ({
    queryKey: QUERY_KEYS.VEHICLES.DETAIL(id),
    queryFn: () => vehicleApi.getVehicleById(id),
    enabled: Boolean(id),
  }),
  byVin: (vin: string) => ({
    queryKey: QUERY_KEYS.VEHICLES.BY_VIN(vin),
    queryFn: () => vehicleApi.getVehicleByVin(vin),
    enabled: Boolean(vin && vin.length === 17),
  }),
  models: () => ({
    queryKey: QUERY_KEYS.VEHICLE_MODELS.ALL,
    queryFn: () => vehicleApi.listModels(),
  }),
};

export function useVehicles(params?: ListVehiclesParams) {
  return useQuery(vehicleQueries.list(params));
}

export function useVehicle(id: string) {
  return useQuery(vehicleQueries.detail(id));
}

export function useVehicleByVin(vin: string) {
  return useQuery(vehicleQueries.byVin(vin));
}

export function useVehicleModels() {
  return useQuery(vehicleQueries.models());
}

export function useCreateVehicle() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateVehicleDTO) => vehicleApi.createVehicle(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vehicles'] });
    },
  });
}

export function useUpdateVehicleStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: VehicleStatus }) =>
      vehicleApi.updateVehicleStatus(id, status),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['vehicles'] });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.VEHICLES.DETAIL(id) });
    },
  });
}

export function useTransferVehicle() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: TransferVehicleDTO }) =>
      vehicleApi.transferVehicle(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vehicles'] });
    },
  });
}

export function useCreateVehicleModel() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateVehicleModelDTO) => vehicleApi.createModel(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.VEHICLE_MODELS.ALL });
    },
  });
}
