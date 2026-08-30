'use client';

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { AxiosError } from 'axios';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogDescription,
} from '@/shared/components/ui/dialog';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { useCreateVehicleModel } from '@/entities/vehicle';
import { Plus, Tag, ShieldAlert, CheckCircle2 } from 'lucide-react';

const createModelSchema = z.object({
  make: z.string().min(1, 'Hãng sản xuất không được để trống'),
  model: z.string().min(1, 'Tên dòng xe / Model không được để trống'),
  year: z
    .number()
    .min(2000, 'Năm sản xuất từ 2000 trở lại đây')
    .max(2035, 'Năm sản xuất không hợp lệ'),
  trim: z.string().optional(),
});

type CreateModelFormData = z.infer<typeof createModelSchema>;

export function CreateModelModal() {
  const [open, setOpen] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const createModelMutation = useCreateVehicleModel();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CreateModelFormData>({
    resolver: zodResolver(createModelSchema),
    defaultValues: {
      make: '',
      model: '',
      year: new Date().getFullYear(),
      trim: '',
    },
  });

  const onSubmit = async (data: CreateModelFormData) => {
    setServerError(null);
    try {
      await createModelMutation.mutateAsync({
        make: data.make.trim(),
        model: data.model.trim(),
        year: Number(data.year),
        trim: data.trim?.trim() || undefined,
      });

      reset();
      setOpen(false);
    } catch (err) {
      const axiosErr = err as AxiosError<{ message?: string; error?: string }>;
      setServerError(
        axiosErr.response?.data?.message ||
          axiosErr.response?.data?.error ||
          axiosErr.message ||
          'Lỗi khi thêm mẫu xe mới'
      );
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Plus className="h-4 w-4 mr-1.5" />
          Thêm Mẫu Xe Mới
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-slate-900">
            <Tag className="h-5 w-5 text-blue-600" />
            Thêm Mẫu Xe Mới Vào Danh Mục
          </DialogTitle>
          <DialogDescription className="text-xs text-slate-500">
            Khai báo hãng sản xuất, tên model và phiên bản để phục vụ nhập kho và báo giá bán.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-2">
          {serverError && (
            <div className="flex items-start gap-2.5 rounded-xl border border-rose-200 bg-rose-50/80 p-3 text-xs text-rose-700">
              <ShieldAlert className="h-4 w-4 shrink-0 mt-0.5" />
              <span>{serverError}</span>
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700">
              Hãng Sản Xuất (Make) *
            </label>
            <Input
              {...register('make')}
              placeholder="VD: Toyota, VinFast, Hyundai, Mercedes-Benz..."
              className={errors.make ? 'border-rose-500' : ''}
            />
            {errors.make && (
              <p className="text-[11px] font-medium text-rose-500">{errors.make.message}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700">
              Tên Dòng Xe (Model) *
            </label>
            <Input
              {...register('model')}
              placeholder="VD: Camry, VF8, Tucson, Ranger, C300..."
              className={errors.model ? 'border-rose-500' : ''}
            />
            {errors.model && (
              <p className="text-[11px] font-medium text-rose-500">{errors.model.message}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700">
                Năm Sản Xuất *
              </label>
              <Input
                type="number"
                {...register('year', { valueAsNumber: true })}
                placeholder="2026"
                className={errors.year ? 'border-rose-500 font-mono' : 'font-mono'}
              />
              {errors.year && (
                <p className="text-[11px] font-medium text-rose-500">{errors.year.message}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700">
                Phiên Bản / Trim
              </label>
              <Input
                {...register('trim')}
                placeholder="VD: 2.5Q, Plus, Premium..."
              />
            </div>
          </div>

          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Hủy
            </Button>
            <Button
              type="submit"
              variant="brand"
              isLoading={isSubmitting || createModelMutation.isPending}
            >
              <CheckCircle2 className="mr-1.5 h-4 w-4" />
              Lưu Dòng Xe
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
