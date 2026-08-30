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
import { useUpdateLeadStatus, Lead, LeadStatus } from '@/entities/lead';
import { AxiosError } from 'axios';
import { ShieldAlert, CheckCircle2 } from 'lucide-react';

interface Props {
  lead: Lead | null;
  targetStatus: LeadStatus | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function UpdateLeadStatusDialog({ lead, targetStatus, open, onOpenChange }: Props) {
  const updateStatusMutation = useUpdateLeadStatus();
  const [lostReason, setLostReason] = useState('GIÁ_CAO');
  const [notes, setNotes] = useState('');
  const [serverError, setServerError] = useState<string | null>(null);

  const isLost = targetStatus === 'LOST';

  const handleConfirm = async () => {
    if (!lead || !targetStatus) return;

    setServerError(null);
    try {
      await updateStatusMutation.mutateAsync({
        id: lead.id,
        data: {
          status: targetStatus,
          lost_reason: isLost ? lostReason : undefined,
          notes: notes?.trim() || undefined,
        },
      });

      onOpenChange(false);
      setNotes('');
    } catch (err) {
      const axiosErr = err as AxiosError<{ message?: string; error?: string }>;
      setServerError(
        axiosErr.response?.data?.message ||
          axiosErr.response?.data?.error ||
          axiosErr.message ||
          'Lỗi khi cập nhật trạng thái cơ hội'
      );
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-slate-900">
            {isLost ? (
              <span className="text-rose-600">Đánh Dấu Thất Bại (LOST)</span>
            ) : (
              <span>Xác Nhận Chuyển Trạng Thái</span>
            )}
          </DialogTitle>
          <DialogDescription className="text-xs text-slate-500">
            Chuyển cơ hội của khách hàng <span className="font-semibold text-slate-800">{lead?.customer_name}</span> sang trạng thái <span className="font-bold font-mono text-blue-600">{targetStatus}</span>.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {serverError && (
            <div className="flex items-start gap-2.5 rounded-xl border border-rose-200 bg-rose-50/80 p-3 text-xs text-rose-700">
              <ShieldAlert className="h-4 w-4 shrink-0 mt-0.5" />
              <span>{serverError}</span>
            </div>
          )}

          {isLost && (
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700">
                Lý Do Thất Bại / Khách Hàng Hủy *
              </label>
              <Select value={lostReason} onValueChange={setLostReason}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="GIÁ_CAO">Giá cao / Chưa thỏa thuận được chiết khấu</SelectItem>
                  <SelectItem value="MUA_HÃNG_KHÁC">Khách chọn mua xe thương hiệu đối thủ</SelectItem>
                  <SelectItem value="CHƯA_ĐỦ_TÀI_CHÍNH">Chưa đủ tài chính / Ngân hàng từ chối vay</SelectItem>
                  <SelectItem value="ĐỔI_Ý_KHÔNG_MUA">Đổi ý / Tạm hoãn kế hoạch mua xe</SelectItem>
                  <SelectItem value="KHÔNG_LIÊN_LẠC_ĐƯỢC">Không liên lạc được nhiều lần</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700">
              Ghi Chú Tiến Trình
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Nhập chi tiết cuộc gọi, phản hồi của khách hàng..."
              className="flex min-h-[72px] w-full rounded-xl border border-slate-200 bg-white p-3 text-xs placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <DialogFooter className="pt-2">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Hủy
          </Button>
          <Button
            variant={isLost ? 'destructive' : 'brand'}
            onClick={handleConfirm}
            isLoading={updateStatusMutation.isPending}
          >
            <CheckCircle2 className="mr-1.5 h-4 w-4" />
            Xác Nhận Chuyển Bước
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
