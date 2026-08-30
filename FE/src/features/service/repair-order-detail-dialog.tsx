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
import { Button } from '@/shared/components/ui/button';
import {
  RepairOrder,
  RepairOrderStatus,
  useUpdateRepairOrderStatus,
  useCreateRepairOrderInvoice,
} from '@/entities/repair-order';
import { formatVND, formatDate, formatVIN } from '@/shared/lib/utils';
import {
  Wrench,
  CheckCircle2,
  Receipt,
  Car,
  User,
  Package,
  Calendar,
  Gauge,
  AlertCircle,
  Plus,
} from 'lucide-react';

interface Props {
  order: RepairOrder | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onOpenAddItem: (orderId: string) => void;
}

export function RepairOrderDetailDialog({
  order,
  open,
  onOpenChange,
  onOpenAddItem,
}: Props) {
  const updateStatusMutation = useUpdateRepairOrderStatus();
  const createInvoiceMutation = useCreateRepairOrderInvoice();

  if (!order) return null;

  const handleUpdateStatus = (status: RepairOrderStatus) => {
    updateStatusMutation.mutate({ id: order.id, data: { status } });
  };

  const handleCreateInvoice = () => {
    createInvoiceMutation.mutate(order.id);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2 text-slate-900">
              <Wrench className="h-5 w-5 text-blue-600" />
              Chi Tiết Lệnh Sửa Chữa & Bảo Dưỡng
            </DialogTitle>
            <Badge
              variant={
                order.status === 'COMPLETED' || order.status === 'INVOICED'
                  ? 'success'
                  : order.status === 'IN_PROGRESS'
                  ? 'warning'
                  : 'secondary'
              }
              dot
            >
              {order.status}
            </Badge>
          </div>
          <DialogDescription className="text-xs text-slate-500">
            Mã lệnh: <span className="font-mono font-bold text-slate-800">#{order.id.slice(0, 8)}</span>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Thông tin chung */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 rounded-2xl border border-slate-200/80 bg-slate-50/50 p-3.5 text-xs">
            <div>
              <span className="text-[10px] uppercase font-semibold text-slate-400 block">Xe (Số VIN)</span>
              <div className="mt-0.5 font-mono font-bold text-blue-600 flex items-center gap-1">
                <Car className="h-3.5 w-3.5" />
                {order.vehicle_vin ? formatVIN(order.vehicle_vin) : 'Xe dịch vụ'}
              </div>
            </div>

            <div>
              <span className="text-[10px] uppercase font-semibold text-slate-400 block">Số KM (ODO)</span>
              <div className="mt-0.5 font-mono font-bold text-slate-800 flex items-center gap-1">
                <Gauge className="h-3.5 w-3.5 text-blue-500" />
                {order.odometer?.toLocaleString('vi-VN')} km
              </div>
            </div>

            <div>
              <span className="text-[10px] uppercase font-semibold text-slate-400 block">Khách Hàng</span>
              <div className="mt-0.5 font-semibold text-slate-800 flex items-center gap-1">
                <User className="h-3.5 w-3.5 text-slate-400" />
                {order.customer_name || 'Khách hàng'}
              </div>
            </div>

            <div>
              <span className="text-[10px] uppercase font-semibold text-slate-400 block">Ngày Tiếp Nhận</span>
              <div className="mt-0.5 text-slate-600 flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5 text-slate-400" />
                {formatDate(order.created_at)}
              </div>
            </div>
          </div>

          {/* Hiện trạng & Chẩn đoán */}
          <div className="rounded-xl border border-slate-200 bg-white p-3 text-xs space-y-1.5">
            <div>
              <span className="font-semibold text-slate-500">Hiện trạng/Yêu cầu: </span>
              <span className="text-slate-800">{order.symptoms || '-'}</span>
            </div>
            {order.odometer_override_reason && (
              <div className="flex items-center gap-1 text-amber-600 font-medium">
                <AlertCircle className="h-3.5 w-3.5" />
                <span>Giải trình mở khóa ODO: {order.odometer_override_reason}</span>
              </div>
            )}
          </div>

          {/* Danh sách vật tư & Tiền công */}
          <div className="space-y-2">
            <div className="flex items-center justify-between border-b border-slate-200 pb-2">
              <h5 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                <Package className="h-4 w-4 text-blue-600" />
                Bảng Bóc Tách Vật Tư & Tiền Công
              </h5>
              {(order.status === 'OPEN' || order.status === 'IN_PROGRESS') && (
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs"
                  onClick={() => {
                    onOpenChange(false);
                    onOpenAddItem(order.id);
                  }}
                >
                  <Plus className="mr-1 h-3.5 w-3.5" />
                  Bổ sung hạng mục
                </Button>
              )}
            </div>

            {order.items && order.items.length > 0 ? (
              <div className="rounded-xl border border-slate-200 overflow-hidden">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] font-bold">
                    <tr>
                      <th className="p-2.5">Loại</th>
                      <th className="p-2.5">Tên Hạng Mục / Mã Vật Tư</th>
                      <th className="p-2.5 text-center">SL</th>
                      <th className="p-2.5 text-right">Đơn Giá</th>
                      <th className="p-2.5 text-right">Thành Tiền</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {order.items.map((item) => (
                      <tr key={item.id} className="hover:bg-slate-50/50">
                        <td className="p-2.5">
                          <span
                            className={`rounded px-1.5 py-0.5 text-[9px] font-bold ${
                              item.item_type === 'PART'
                                ? 'bg-blue-100 text-blue-700'
                                : 'bg-amber-100 text-amber-700'
                            }`}
                          >
                            {item.item_type}
                          </span>
                        </td>
                        <td className="p-2.5 font-medium text-slate-900">{item.item_name}</td>
                        <td className="p-2.5 text-center font-mono">{item.quantity}</td>
                        <td className="p-2.5 text-right font-mono">{formatVND(item.unit_price)}</td>
                        <td className="p-2.5 text-right font-mono font-bold text-slate-900">
                          {formatVND(item.subtotal || parseFloat(item.unit_price) * item.quantity)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-slate-50 font-bold border-t border-slate-200">
                    <tr>
                      <td colSpan={4} className="p-2.5 text-right">Tổng Chi Phí:</td>
                      <td className="p-2.5 text-right font-mono font-black text-emerald-600">
                        {formatVND(order.total_cost)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-slate-200 p-6 text-center text-xs text-slate-400">
                Chưa có hạng mục vật tư hoặc công thợ nào được kê khai.
              </div>
            )}
          </div>

          {/* Action Buttons (Quy Trình Sửa Chữa) */}
          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-200 pt-3">
            <div className="text-xs text-slate-500">
              Trạng thái: <span className="font-bold text-slate-800">{order.status}</span>
            </div>

            <div className="flex items-center gap-2">
              {order.status === 'OPEN' && (
                <Button
                  size="sm"
                  variant="brand"
                  onClick={() => handleUpdateStatus('IN_PROGRESS')}
                  isLoading={updateStatusMutation.isPending}
                >
                  <Wrench className="mr-1.5 h-4 w-4" />
                  Bắt Đầu Sửa Chữa (IN_PROGRESS)
                </Button>
              )}

              {order.status === 'IN_PROGRESS' && (
                <Button
                  size="sm"
                  className="bg-emerald-600 hover:bg-emerald-700 text-white"
                  onClick={() => handleUpdateStatus('COMPLETED')}
                  isLoading={updateStatusMutation.isPending}
                >
                  <CheckCircle2 className="mr-1.5 h-4 w-4" />
                  Nghiệm Thu Hoàn Tất (COMPLETED)
                </Button>
              )}

              {order.status === 'COMPLETED' && (
                <Button
                  size="sm"
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                  onClick={handleCreateInvoice}
                  isLoading={createInvoiceMutation.isPending}
                >
                  <Receipt className="mr-1.5 h-4 w-4" />
                  Xuất Hóa Đơn Sang Kế Toán (/finance)
                </Button>
              )}

              {order.status === 'INVOICED' && (
                <Badge variant="success" className="text-xs py-1">
                  Đã Xuất Hóa Đơn Kế Toán
                </Badge>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
