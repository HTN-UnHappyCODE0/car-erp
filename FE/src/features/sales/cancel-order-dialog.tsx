'use client';

import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/shared/components/ui/dialog';
import { Button } from '@/shared/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/components/ui/select';
import { useCancelSalesOrder, SalesOrder, DepositResolution } from '@/entities/sales-order';
import { AlertOctagon, ShieldAlert, CheckCircle2, Lock } from 'lucide-react';
import { formatVND, formatVIN } from '@/shared/lib/utils';
import { AxiosError } from 'axios';

interface Props {
  order: SalesOrder | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CancelOrderDialog({ order, open, onOpenChange }: Props) {
  const cancelOrderMutation = useCancelSalesOrder();

  const [cancelReason, setCancelReason] = useState('');
  const [depositResolution, setDepositResolution] = useState<DepositResolution>('FORFEITED');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const depositNum = order?.deposit_amount ? parseFloat(order.deposit_amount) : 0;
  const hasDeposit = depositNum > 0 && (order?.status === 'DEPOSIT_PAID' || order?.status === 'FULL_PAID');

  const handleClose = () => {
    setCancelReason('');
    setErrorMsg(null);
    onOpenChange(false);
  };

  const handleCancel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!order) return;

    if (!cancelReason.trim() || cancelReason.trim().length < 5) {
      setErrorMsg('Lý do hủy đơn hàng bắt buộc phải có ít nhất 5 ký tự.');
      return;
    }

    if (hasDeposit && (!depositResolution || depositResolution === 'NONE')) {
      setErrorMsg('Đơn hàng đã có tiền cọc. Bắt buộc phải chọn phương án xử lý cọc kế toán.');
      return;
    }

    try {
      setErrorMsg(null);
      await cancelOrderMutation.mutateAsync({
        id: order.id,
        data: {
          cancel_reason: cancelReason.trim(),
          deposit_resolution: hasDeposit ? depositResolution : 'NONE',
        },
      });

      handleClose();
    } catch (err) {
      const axiosErr = err as AxiosError<{ message?: string; error?: string }>;
      setErrorMsg(
        axiosErr.response?.data?.message ||
          axiosErr.response?.data?.error ||
          axiosErr.message ||
          'Lỗi khi thực hiện hủy đơn bán xe'
      );
    }
  };

  return (
    <Dialog open={open} onOpenChange={(val) => (!val ? handleClose() : onOpenChange(val))}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-rose-600">
            <AlertOctagon className="h-5 w-5" />
            Hủy Hợp Đồng Bán Xe & Mở Khóa Kho
          </DialogTitle>
          <DialogDescription className="text-xs text-slate-500">
            Hủy đơn hàng <span className="font-mono font-bold text-slate-800">#{order?.id.slice(0, 8)}</span> của khách hàng <span className="font-semibold">{order?.customer_name}</span>.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleCancel} className="space-y-4 py-2">
          {errorMsg && (
            <div className="flex items-start gap-2.5 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700">
              <ShieldAlert className="h-4 w-4 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          <div className="rounded-xl border border-rose-200 bg-rose-50/50 p-3 text-xs">
            <p className="text-slate-700">
              Chiếc xe số VIN <span className="font-mono font-bold text-blue-600">{order?.vehicle_vin ? formatVIN(order.vehicle_vin) : 'liên kết'}</span> sẽ tự động được <span className="font-bold text-emerald-600">mở khóa về kho (IN_STOCK)</span> để sẵn sàng chào bán lại.
            </p>
            {hasDeposit && (
              <div className="mt-2 flex items-center justify-between border-t border-rose-200/60 pt-2 font-semibold text-rose-700">
                <span>Số tiền cọc đã ghi nhận:</span>
                <span className="text-sm font-bold">{formatVND(order?.deposit_amount)}</span>
              </div>
            )}
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700">
              Lý Do Hủy Đơn Hàng (Tối thiểu 5 ký tự) *
            </label>
            <textarea
              className="flex min-h-[72px] w-full rounded-xl border border-slate-200 bg-white p-3 text-xs placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-rose-500"
              placeholder="Khách hàng đổi ý, ngân hàng từ chối giải ngân, khách chọn mua dòng xe khác..."
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              required
            />
          </div>

          {/* Phương án xử lý cọc kế toán nghiêm ngặt */}
          {hasDeposit ? (
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 flex items-center gap-1">
                <Lock className="h-3.5 w-3.5 text-amber-500" />
                Hướng Giải Quyết Tiền Cọc Kế Toán *
              </label>
              <Select
                value={depositResolution}
                onValueChange={(val) => setDepositResolution(val as DepositResolution)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Chọn phương án xử lý cọc..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="FORFEITED">Tịch thu cọc (Ghi nhận Thu nhập khác của đại lý)</SelectItem>
                  <SelectItem value="PENDING_REFUND">Chờ kế toán hoàn tiền cọc cho khách hàng</SelectItem>
                  <SelectItem value="CREDITED">Bảo lưu tiền cọc để cấn trừ hợp đồng sau</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-[10px] text-slate-500">
                Đơn hàng có cọc {formatVND(order?.deposit_amount)} nên lựa chọn &quot;Không xử lý cọc&quot; bị vô hiệu hóa.
              </p>
            </div>
          ) : (
            <div className="rounded-lg bg-slate-100 p-2.5 text-[11px] text-slate-500">
              Đơn hàng chưa phát sinh tiền cọc (DRAFT), hệ thống tự động ghi nhận phương án <span className="font-mono font-semibold">NONE</span>.
            </div>
          )}

          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" onClick={handleClose}>
              Quay Lại
            </Button>
            <Button type="submit" variant="destructive" isLoading={cancelOrderMutation.isPending}>
              <CheckCircle2 className="mr-1.5 h-4 w-4" />
              Xác Nhận Hủy Hợp Đồng
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
