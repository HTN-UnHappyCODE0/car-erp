'use client';

import React, { useState } from 'react';
import { useForm, Controller, useWatch } from 'react-hook-form';
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
import { CurrencyInput } from '@/shared/components/ui/currency-input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/components/ui/select';
import { useCreateVehicle, useVehicleModels } from '@/entities/vehicle';
import { useBranches } from '@/entities/branch';
import { Plus, Car, ShieldAlert, CheckCircle2 } from 'lucide-react';

// Zod Schema chuẩn ISO 3779 cho số VIN (17 ký tự, không chứa I, O, Q)
const createVehicleSchema = z.object({
  model_id: z.string().min(1, 'Vui lòng chọn dòng xe (Model)'),
  branch_id: z.string().optional(),
  vin: z
    .string()
    .trim()
    .toUpperCase()
    .length(17, 'Số VIN phải đúng chính xác 17 ký tự')
    .regex(
      /^[A-HJ-NPR-Z0-9]{17}$/,
      'Số VIN không hợp lệ (không chứa ký tự I, O, Q theo chuẩn quốc tế ISO 3779)'
    ),
  engine_number: z.string().optional(),
  color_exterior: z.string().optional(),
  color_interior: z.string().optional(),
  purchase_price: z
    .string()
    .min(1, 'Vui lòng nhập giá nhập xe từ hãng')
    .refine((val) => !isNaN(Number(val)) && Number(val) > 0, {
      message: 'Giá nhập xe phải là số dương lớn hơn 0',
    }),
});

type CreateVehicleFormData = z.infer<typeof createVehicleSchema>;

export function CreateVehicleModal() {
  const [open, setOpen] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const { data: models = [] } = useVehicleModels();
  const { data: branches = [] } = useBranches();
  const createVehicleMutation = useCreateVehicle();

  const {
    register,
    handleSubmit,
    control,
    setValue,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CreateVehicleFormData>({
    resolver: zodResolver(createVehicleSchema),
    defaultValues: {
      model_id: '',
      branch_id: '',
      vin: '',
      engine_number: '',
      color_exterior: '',
      color_interior: '',
      purchase_price: '',
    },
  });

  const vinValue = useWatch({ control, name: 'vin' }) || '';

  // Xử lý Input Masking cho Số VIN (Chặn ngay phím I, O, Q và tự động viết hoa)
  const handleVinChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.toUpperCase();
    // Loại bỏ mọi ký tự không thuộc bảng chữ cái chuẩn ISO 3779 (bỏ I, O, Q và ký tự đặc biệt)
    const sanitized = raw.replace(/[^A-HJ-NPR-Z0-9]/g, '').slice(0, 17);
    setValue('vin', sanitized, { shouldValidate: true });
  };

  const onSubmit = async (data: CreateVehicleFormData) => {
    setServerError(null);
    try {
      await createVehicleMutation.mutateAsync({
        model_id: data.model_id,
        branch_id: data.branch_id || undefined,
        vin: data.vin.trim().toUpperCase(),
        engine_number: data.engine_number?.trim() || undefined,
        color_exterior: data.color_exterior?.trim() || undefined,
        color_interior: data.color_interior?.trim() || undefined,
        purchase_price: data.purchase_price,
      });

      reset();
      setOpen(false);
    } catch (err) {
      const axiosErr = err as AxiosError<{ message?: string; error?: string }>;
      setServerError(
        axiosErr.response?.data?.message ||
          axiosErr.response?.data?.error ||
          axiosErr.message ||
          'Lỗi khi nhập xe vào kho'
      );
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="brand" size="sm" className="shadow-sm">
          <Plus className="h-4 w-4 mr-1.5" />
          Nhập Xe Mới
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-slate-900">
            <Car className="h-5 w-5 text-blue-600" />
            Nhập Xe Mới Vào Kho (Số Khung VIN)
          </DialogTitle>
          <DialogDescription className="text-xs text-slate-500">
            Khởi tạo xe vật lý trong kho theo chuẩn số khung quốc tế ISO 3779 và liên kết dòng xe.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-2">
          {serverError && (
            <div className="flex items-start gap-2.5 rounded-xl border border-rose-200 bg-rose-50/80 p-3 text-xs text-rose-700">
              <ShieldAlert className="h-4 w-4 shrink-0 mt-0.5" />
              <span>{serverError}</span>
            </div>
          )}

          {/* Dòng xe & Chi nhánh */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700">
                Dòng Xe (Model) *
              </label>
              <Controller
                name="model_id"
                control={control}
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger className={errors.model_id ? 'border-rose-500' : ''}>
                      <SelectValue placeholder="Chọn dòng xe..." />
                    </SelectTrigger>
                    <SelectContent>
                      {models.map((m) => (
                        <SelectItem key={m.id} value={m.id}>
                          {m.make} {m.model} ({m.year}) {m.trim && `- ${m.trim}`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.model_id && (
                <p className="text-[11px] font-medium text-rose-500">{errors.model_id.message}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700">
                Showroom Nhập Kho
              </label>
              <Controller
                name="branch_id"
                control={control}
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger>
                      <SelectValue placeholder="Mặc định chi nhánh..." />
                    </SelectTrigger>
                    <SelectContent>
                      {branches.map((b) => (
                        <SelectItem key={b.id} value={b.id}>
                          {b.name} ({b.code})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
          </div>

          {/* Số VIN với Input Masking */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-700">
                Số Khung VIN (17 Ký Tự ISO 3779) *
              </label>
              <span className="text-[10px] font-mono font-medium text-slate-400">
                {vinValue.length}/17 ký tự
              </span>
            </div>
            <Input
              value={vinValue}
              onChange={handleVinChange}
              placeholder="VD: 1HGCR2F83HA123456"
              maxLength={17}
              className={`font-mono uppercase tracking-wider ${
                errors.vin ? 'border-rose-500 focus:ring-rose-500' : ''
              }`}
            />
            {errors.vin ? (
              <p className="text-[11px] font-medium text-rose-500">{errors.vin.message}</p>
            ) : (
              <p className="text-[10px] text-slate-500">
                Đã kích hoạt Input Masking: Tự động viết hoa và chặn ngay các phím I, O, Q theo chuẩn quốc tế.
              </p>
            )}
          </div>

          {/* Số máy & Giá nhập (CurrencyInput) */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700">
                Số Máy (Engine Number)
              </label>
              <Input
                {...register('engine_number')}
                placeholder="VD: 2AR-FE-987654"
                className="font-mono uppercase"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700">
                Giá Nhập Từ Hãng (VND) *
              </label>
              <Controller
                name="purchase_price"
                control={control}
                render={({ field }) => (
                  <CurrencyInput
                    value={field.value}
                    onValueChange={field.onChange}
                    placeholder="1,050,000,000"
                    className={errors.purchase_price ? 'border-rose-500' : ''}
                  />
                )}
              />
              {errors.purchase_price && (
                <p className="text-[11px] font-medium text-rose-500">
                  {errors.purchase_price.message}
                </p>
              )}
            </div>
          </div>

          {/* Màu xe ngoại / nội thất */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700">
                Màu Ngoại Thất
              </label>
              <Input
                {...register('color_exterior')}
                placeholder="Trắng ngọc trai, Đen..."
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700">
                Màu Nội Thất
              </label>
              <Input
                {...register('color_interior')}
                placeholder="Nâu da bò, Đen..."
              />
            </div>
          </div>

          <DialogFooter className="pt-3">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Hủy
            </Button>
            <Button
              type="submit"
              variant="brand"
              isLoading={isSubmitting || createVehicleMutation.isPending}
            >
              <CheckCircle2 className="mr-1.5 h-4 w-4" />
              Xác Nhận Nhập Kho
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
