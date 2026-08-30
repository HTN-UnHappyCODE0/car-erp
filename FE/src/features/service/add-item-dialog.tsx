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
import { Input } from '@/shared/components/ui/input';
import { CurrencyInput } from '@/shared/components/ui/currency-input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/components/ui/select';
import { useAddRepairOrderItem, RepairItemType } from '@/entities/repair-order';
import { useAuthStore } from '@/shared/store/auth-store';
import { Wrench, Package, Lock, CheckCircle2 } from 'lucide-react';
import { AxiosError } from 'axios';

interface Props {
  orderId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AddItemDialog({ orderId, open, onOpenChange }: Props) {
  const addItemMutation = useAddRepairOrderItem();
  const { user } = useAuthStore();
  const isMechanic = user?.role === 'mechanic';

  const [itemType, setItemType] = useState<RepairItemType>('PART');
  const [description, setDescription] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [unitPrice, setUnitPrice] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orderId || !description.trim() || !unitPrice) {
      setErrorMsg('Vui lòng nhập đầy đủ mô tả vật tư/công việc và đơn giá.');
      return;
    }

    try {
      setErrorMsg(null);
      await addItemMutation.mutateAsync({
        id: orderId,
        data: {
          item_type: itemType,
          item_name: description.trim(),
          quantity: parseInt(quantity, 10) || 1,
          unit_price: unitPrice,
        },
      });

      onOpenChange(false);
      setDescription('');
      setQuantity('1');
      setUnitPrice('');
    } catch (err) {
      const axiosErr = err as AxiosError<{ message?: string }>;
      setErrorMsg(axiosErr.response?.data?.message || axiosErr.message || 'Lỗi thêm hạng mục vào lệnh sửa chữa');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-slate-900">
            <Wrench className="h-5 w-5 text-blue-600" />
            Bổ Sung Vật Tư / Tiền Công Sửa Chữa
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          {errorMsg && (
            <div className="rounded-lg bg-rose-50 p-3 text-xs font-medium text-rose-700">
              {errorMsg}
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700">
              Loại Hạng Mục *
            </label>
            <Select
              value={itemType}
              onValueChange={(val) => setItemType(val as RepairItemType)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Chọn loại..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="PART">
                  <div className="flex items-center gap-1.5">
                    <Package className="h-3.5 w-3.5 text-blue-500" />
                    <span>Phụ Tùng / Linh Kiện Thay Thế (PART)</span>
                  </div>
                </SelectItem>
                <SelectItem value="LABOR">
                  <div className="flex items-center gap-1.5">
                    <Wrench className="h-3.5 w-3.5 text-amber-500" />
                    <span>Tiền Công Thợ Kỹ Thuật (LABOR)</span>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700">
              Tên Hạng Mục / Mã Phụ Tùng *
            </label>
            <Input
              placeholder="VD: Lọc dầu động cơ, Công thay phanh trước..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="text-xs"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700">
                Số Lượng *
              </label>
              <Input
                type="number"
                min={1}
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                className="text-xs font-mono"
                required
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-slate-700">
                  Đơn Giá (VND) *
                </label>
                {isMechanic && (
                  <span className="flex items-center gap-0.5 text-[10px] text-slate-400">
                    <Lock className="h-3 w-3" /> Khóa giá
                  </span>
                )}
              </div>
              <CurrencyInput
                value={unitPrice}
                onValueChange={setUnitPrice}
                placeholder="250,000"
                disabled={isMechanic}
                className="text-xs font-mono"
              />
            </div>
          </div>

          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Hủy
            </Button>
            <Button type="submit" variant="brand" isLoading={addItemMutation.isPending}>
              <CheckCircle2 className="mr-1.5 h-4 w-4" />
              Thêm Vào Lệnh Sửa Chữa
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
