'use client';

import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/shared/components/ui/dialog';
import { Badge } from '@/shared/components/ui/badge';
import { useVehicleServiceHistory, RepairOrder } from '@/entities/repair-order';
import { formatVND, formatDate, formatVIN } from '@/shared/lib/utils';
import {
  History,
  Calendar,
  Gauge,
  User,
  Package,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';

interface Props {
  vehicleId: string | null;
  vehicleVin?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function VehicleHistoryDrawer({
  vehicleId,
  vehicleVin,
  open,
  onOpenChange,
}: Props) {
  const { data: history = [], isLoading } = useVehicleServiceHistory(vehicleId || '');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2 text-slate-900">
              <History className="h-5 w-5 text-blue-600" />
              Sổ Lịch Sử Bảo Dưỡng & Sửa Chữa Xe
            </DialogTitle>
          </div>
          <DialogDescription className="text-xs text-slate-500">
            Số VIN: <span className="font-mono font-bold text-blue-600">{vehicleVin ? formatVIN(vehicleVin) : 'Đang chọn'}</span>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {isLoading ? (
            <div className="py-8 text-center text-xs text-slate-400">
              Đang tải toàn bộ lịch sử xưởng dịch vụ...
            </div>
          ) : history.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-200 p-8 text-center text-xs text-slate-400">
              <AlertCircle className="mx-auto h-8 w-8 text-slate-300 mb-2" />
              Chiếc xe này chưa có lịch sử tiếp nhận bảo dưỡng nào tại hệ thống.
            </div>
          ) : (
            <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-3 before:bottom-3 before:w-0.5 before:bg-slate-200">
              {history.map((order: RepairOrder) => (
                <div key={order.id} className="relative group">
                  {/* Node Dot */}
                  <div className="absolute -left-6 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-blue-100 text-blue-600 ring-4 ring-white">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                  </div>

                  <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs space-y-3">
                    {/* Header: Date, ODO, Status */}
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2.5">
                      <div className="flex items-center gap-3">
                        <div suppressHydrationWarning className="flex items-center gap-1 text-xs font-semibold text-slate-800 font-mono">
                          <Calendar className="h-3.5 w-3.5 text-slate-400" />
                          {formatDate(order.created_at)}
                        </div>
                        <div className="flex items-center gap-1 rounded-md bg-slate-100 px-2 py-0.5 font-mono text-xs font-bold text-slate-700">
                          <Gauge className="h-3.5 w-3.5 text-blue-500" />
                          {order.odometer?.toLocaleString('vi-VN')} km
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-emerald-600">
                          {formatVND(order.total_cost)}
                        </span>
                        <Badge
                          variant={
                            order.status === 'COMPLETED' || order.status === 'INVOICED'
                              ? 'success'
                              : 'warning'
                          }
                          className="text-[10px]"
                        >
                          {order.status}
                        </Badge>
                      </div>
                    </div>

                    {/* Symptoms & Diagnosis */}
                    <div className="text-xs space-y-1">
                      <div>
                        <span className="font-semibold text-slate-500">Hiện trạng/Yêu cầu: </span>
                        <span className="text-slate-800">{order.symptoms || '-'}</span>
                      </div>
                      {order.diagnosis && (
                        <div>
                          <span className="font-semibold text-blue-600">Chẩn đoán kỹ thuật: </span>
                          <span className="text-slate-800">{order.diagnosis}</span>
                        </div>
                      )}
                    </div>

                    {/* Items List (Parts & Labor) */}
                    {order.items && order.items.length > 0 && (
                      <div className="rounded-xl bg-slate-50 p-2.5 space-y-1.5">
                        <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider flex items-center gap-1">
                          <Package className="h-3 w-3" />
                          Vật Tư Phụ Tùng & Tiền Công Đã Thực Hiện:
                        </div>
                        <div className="space-y-1 text-xs">
                          {order.items.map((item) => (
                            <div
                              key={item.id}
                              className="flex items-center justify-between text-[11px] text-slate-700"
                            >
                              <span className="flex items-center gap-1">
                                <span
                                  className={`rounded-sm px-1 text-[9px] font-bold ${
                                    item.item_type === 'PART'
                                      ? 'bg-blue-100 text-blue-700'
                                      : 'bg-amber-100 text-amber-700'
                                  }`}
                                >
                                  {item.item_type}
                                </span>
                                {item.item_name} (x{item.quantity})
                              </span>
                              <span className="font-mono font-medium text-slate-600">
                                {formatVND(item.subtotal || parseFloat(item.unit_price) * item.quantity)}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Mechanic In Charge */}
                    {order.mechanic_name && (
                      <div className="flex items-center gap-1 text-[11px] text-slate-400">
                        <User className="h-3 w-3" />
                        <span>Kỹ thuật viên phụ trách: <span className="font-medium text-slate-600">{order.mechanic_name}</span></span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
