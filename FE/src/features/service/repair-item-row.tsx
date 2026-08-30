'use client';

import React from 'react';
import { Control, Controller } from 'react-hook-form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/components/ui/select';
import { Input } from '@/shared/components/ui/input';
import { CurrencyInput } from '@/shared/components/ui/currency-input';
import { Button } from '@/shared/components/ui/button';
import { Trash2, Lock, Wrench, Package } from 'lucide-react';
import type { CreateRepairFormData } from './create-repair-modal';

interface RepairItemRowProps {
  index: number;
  control: Control<CreateRepairFormData>;
  isPriceLocked: boolean;
  isLastRow: boolean;
  onRemove: (index: number) => void;
  onAutoAppend: () => void;
}

export const RepairItemRow = React.memo(function RepairItemRow({
  index,
  control,
  isPriceLocked,
  isLastRow,
  onRemove,
  onAutoAppend,
}: RepairItemRowProps) {
  return (
    <div className="grid grid-cols-12 gap-2 items-center rounded-xl border border-slate-200/80 bg-white p-2.5 shadow-xs transition-all hover:border-blue-300">
      {/* 1. Loại hạng mục */}
      <div className="col-span-3 sm:col-span-2">
        <Controller
          name={`items.${index}.item_type`}
          control={control}
          render={({ field }) => (
            <Select value={field.value} onValueChange={field.onChange}>
              <SelectTrigger className="h-8 text-xs font-semibold">
                <SelectValue placeholder="Loại" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="PART" className="text-xs font-medium">
                  <div className="flex items-center gap-1.5">
                    <Package className="h-3.5 w-3.5 text-blue-500" />
                    <span>Phụ tùng</span>
                  </div>
                </SelectItem>
                <SelectItem value="LABOR" className="text-xs font-medium">
                  <div className="flex items-center gap-1.5">
                    <Wrench className="h-3.5 w-3.5 text-amber-500" />
                    <span>Tiền công</span>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          )}
        />
      </div>

      {/* 2. Tên hạng mục / Mã phụ tùng */}
      <div className="col-span-4 sm:col-span-4">
        <Controller
          name={`items.${index}.item_name`}
          control={control}
          render={({ field }) => (
            <Input
              {...field}
              placeholder="VD: Lọc dầu động cơ, Công thay phanh..."
              className="h-8 text-xs placeholder:text-slate-400"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  if (isLastRow && field.value?.trim()) {
                    onAutoAppend();
                  }
                }
              }}
              onBlur={() => {
                if (isLastRow && field.value?.trim()) {
                  onAutoAppend();
                }
              }}
            />
          )}
        />
      </div>

      {/* 3. Số lượng */}
      <div className="col-span-2 sm:col-span-2">
        <Controller
          name={`items.${index}.quantity`}
          control={control}
          render={({ field }) => (
            <Input
              type="number"
              min={1}
              value={field.value}
              onChange={(e) => field.onChange(parseInt(e.target.value, 10) || 1)}
              className="h-8 text-xs font-mono text-center"
              title="Số lượng"
            />
          )}
        />
      </div>

      {/* 4. Đơn giá (Field-Level RBAC Lock) */}
      <div className="col-span-3 sm:col-span-3">
        <Controller
          name={`items.${index}.unit_price`}
          control={control}
          render={({ field }) => (
            <div className="relative">
              <CurrencyInput
                value={field.value}
                onValueChange={field.onChange}
                placeholder="250,000"
                disabled={isPriceLocked}
                className={`h-8 text-xs ${isPriceLocked ? 'bg-slate-100 text-slate-500' : ''}`}
              />
              {isPriceLocked && (
                <span
                  className="absolute right-2 top-2"
                  title="Đơn giá bị khóa theo quyền Thợ máy"
                >
                  <Lock className="h-3.5 w-3.5 text-slate-400" />
                </span>
              )}
            </div>
          )}
        />
      </div>

      {/* 5. Nút xóa dòng */}
      <div className="col-span-12 sm:col-span-1 flex justify-end">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0 text-slate-400 hover:text-rose-600 hover:bg-rose-50"
          onClick={() => onRemove(index)}
          title="Xóa hạng mục"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
});
