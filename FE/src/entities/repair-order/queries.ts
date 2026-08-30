import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { QUERY_KEYS } from '@/shared/config/constants';
import { repairOrderApi } from './api';
import {
  ListRepairOrdersParams,
  CreateRepairOrderDTO,
  UpdateRepairOrderStatusDTO,
  AssignMechanicDTO,
  AddRepairOrderItemDTO,
} from './types';

export const repairOrderQueries = {
  list: (params?: ListRepairOrdersParams) => ({
    queryKey: QUERY_KEYS.REPAIR_ORDERS.ALL(params),
    queryFn: () => repairOrderApi.list(params),
  }),
  detail: (id: string) => ({
    queryKey: QUERY_KEYS.REPAIR_ORDERS.DETAIL(id),
    queryFn: () => repairOrderApi.getById(id),
    enabled: Boolean(id),
  }),
  history: (vehicleId: string) => ({
    queryKey: QUERY_KEYS.REPAIR_ORDERS.VEHICLE_HISTORY(vehicleId),
    queryFn: () => repairOrderApi.getVehicleHistory(vehicleId),
    enabled: Boolean(vehicleId),
  }),
};

export function useRepairOrders(params?: ListRepairOrdersParams) {
  return useQuery(repairOrderQueries.list(params));
}

export function useRepairOrder(id: string) {
  return useQuery(repairOrderQueries.detail(id));
}

export function useVehicleServiceHistory(vehicleId: string) {
  return useQuery(repairOrderQueries.history(vehicleId));
}

export function useCreateRepairOrder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateRepairOrderDTO) => repairOrderApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['repair-orders'] });
    },
  });
}

export function useUpdateRepairOrderStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateRepairOrderStatusDTO }) =>
      repairOrderApi.updateStatus(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['repair-orders'] });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.REPAIR_ORDERS.DETAIL(id) });
    },
  });
}

export function useAssignMechanic() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: AssignMechanicDTO }) =>
      repairOrderApi.assignMechanic(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['repair-orders'] });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.REPAIR_ORDERS.DETAIL(id) });
    },
  });
}

export function useAddRepairOrderItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: AddRepairOrderItemDTO }) =>
      repairOrderApi.addItem(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['repair-orders'] });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.REPAIR_ORDERS.DETAIL(id) });
    },
  });
}

export function useDeleteRepairOrderItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, itemId }: { id: string; itemId: string }) =>
      repairOrderApi.deleteItem(id, itemId),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['repair-orders'] });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.REPAIR_ORDERS.DETAIL(id) });
    },
  });
}

export function useCreateRepairOrderInvoice() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => repairOrderApi.createInvoice(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['repair-orders'] });
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
    },
  });
}
