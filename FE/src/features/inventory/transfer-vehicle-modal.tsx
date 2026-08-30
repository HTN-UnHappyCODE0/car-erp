'use client';

import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/shared/components/ui/dialog';
import { Button } from '@/shared/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/components/ui/select';
import { useTransferVehicle, Vehicle } from '@/entities/vehicle';
import { useBranches } from '@/entities/branch';
import { ArrowRightLeft } from 'lucide-react';
import { AxiosError } from 'axios';

interface Props {
  vehicle: Vehicle | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function TransferVehicleModal({ vehicle, open, onOpenChange }: Props) {
  const { data: branches = [] } = useBranches();
  const transferMutation = useTransferVehicle();

  const [toBranchId, setToBranchId] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!vehicle || !toBranchId) {
      setErrorMsg('Vui lòng chọn chi nhánh đích để điều chuyển.');
      return;
    }

    try {
      setErrorMsg(null);
      await transferMutation.mutateAsync({
        id: vehicle.id,
        data: { to_branch_id: toBranchId },
      });
      onOpenChange(false);
      setToBranchId('');
    } catch (err) {
      const axiosErr = err as AxiosError<{ message?: string }>;
      setErrorMsg(axiosErr.response?.data?.message || axiosErr.message || 'Lỗi điều chuyển xe');
    }
  };

  const availableBranches = branches.filter((b) => b.id !== vehicle?.branch_id);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ArrowRightLeft className="h-5 w-5 text-blue-600" />
            Điều Chuyển Xe Giữa Chi Nhánh
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleTransfer} className="space-y-4 py-2">
          {errorMsg && (
            <div className="rounded-lg bg-rose-50 p-3 text-xs font-medium text-rose-700">
              {errorMsg}
            </div>
          )}

          <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-3.5">
            <div className="text-xs text-slate-500">Thông tin xe đang chọn:</div>
            <div className="mt-1 font-mono text-sm font-bold text-blue-600">
              VIN: {vehicle?.vin}
            </div>
            <div className="text-xs text-slate-700">
              Trạng thái hiện tại: <span className="font-semibold">{vehicle?.status}</span>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700">
              Chuyển Đến Chi Nhánh Mới *
            </label>
            <Select value={toBranchId} onValueChange={setToBranchId}>
              <SelectTrigger>
                <SelectValue placeholder="Chọn chi nhánh đích..." />
              </SelectTrigger>
              <SelectContent>
                {availableBranches.map((b) => (
                  <SelectItem key={b.id} value={b.id}>
                    {b.name} ({b.code})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Hủy
            </Button>
            <Button type="submit" variant="brand" isLoading={transferMutation.isPending}>
              Thực Hiện Điều Chuyển
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
