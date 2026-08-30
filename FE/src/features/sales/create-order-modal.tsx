'use client';

import React, { useMemo } from 'react';
import { useForm, Controller, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { AxiosError } from 'axios';
import { useQueryClient } from '@tanstack/react-query';
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
import { CurrencyInput } from '@/shared/components/ui/currency-input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/components/ui/select';
import { useCreateSalesOrder } from '@/entities/sales-order';
import { useVehicles, useVehicleModels } from '@/entities/vehicle';
import { useCustomers } from '@/entities/customer';
import { formatVIN, formatVND } from '@/shared/lib/utils';
import { ShoppingBag, Plus, Car, ShieldAlert, CheckCircle2, Info, Calculator, AlertTriangle } from 'lucide-react';

const createOrderSchema = z.object({
  customer_id: z.string().min(1, 'Vui lòng chọn khách hàng ký hợp đồng'),
  model_id: z.string().min(1, 'Vui lòng chọn dòng xe'),
  vehicle_id: z.string().min(1, 'Vui lòng chọn số VIN xe cụ thể trong kho'),
  total_amount: z
    .string()
    .min(1, 'Vui lòng nhập tổng giá bán')
    .refine((val) => !isNaN(Number(val)) && Number(val) > 0, {
      message: 'Tổng giá bán phải là số dương lớn hơn 0',
    }),
  discount_amount: z.string().optional(),
  deposit_amount: z.string().optional(),
});

type CreateOrderFormData = z.infer<typeof createOrderSchema>;

export function CreateOrderModal() {
  const [open, setOpen] = React.useState(false);
  const [serverError, setServerError] = React.useState<string | null>(null);
  const [isConflictError, setIsConflictError] = React.useState(false);

  const queryClient = useQueryClient();
  const { data: inStockVehicles = [] } = useVehicles({ status: 'IN_STOCK' });
  const { data: models = [] } = useVehicleModels();
  const { data: customers = [] } = useCustomers();
  const createOrderMutation = useCreateSalesOrder();

  const {
    handleSubmit,
    control,
    setValue,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CreateOrderFormData>({
    resolver: zodResolver(createOrderSchema),
    defaultValues: {
      customer_id: '',
      model_id: '',
      vehicle_id: '',
      total_amount: '',
      discount_amount: '0',
      deposit_amount: '0',
    },
  });

  const selectedModelId = useWatch({ control, name: 'model_id' });
  const selectedVehicleId = useWatch({ control, name: 'vehicle_id' });
  const totalAmountStr = useWatch({ control, name: 'total_amount' }) || '0';
  const discountAmountStr = useWatch({ control, name: 'discount_amount' }) || '0';
  const depositAmountStr = useWatch({ control, name: 'deposit_amount' }) || '0';

  // 1. Dependent Dropdown: Lọc danh sách xe theo Model đã chọn và có trạng thái IN_STOCK
  const availableVehiclesForModel = useMemo(() => {
    if (!selectedModelId) return [];
    return inStockVehicles.filter((v) => v.model_id === selectedModelId);
  }, [inStockVehicles, selectedModelId]);

  // Lấy thông tin chiếc xe đang chọn
  const currentSelectedVehicle = useMemo(() => {
    return inStockVehicles.find((v) => v.id === selectedVehicleId);
  }, [inStockVehicles, selectedVehicleId]);

  // 1. Tinh chỉnh 1: Xóa sạch dữ liệu rác khi thay đổi Model xe
  const handleModelChange = (modelId: string) => {
    setValue('model_id', modelId, { shouldValidate: true });
    setValue('vehicle_id', '', { shouldValidate: true });
    setServerError(null);
    setIsConflictError(false);
  };

  // 3. Tinh chỉnh 3: Tự động tính toán chiết khấu và số tiền còn lại phải thu (Smart Calculation)
  const totalAmountNum = parseFloat(totalAmountStr) || 0;
  const discountAmountNum = parseFloat(discountAmountStr) || 0;
  const depositAmountNum = parseFloat(depositAmountStr) || 0;

  const actualPrice = Math.max(0, totalAmountNum - discountAmountNum);
  const remainingAmount = Math.max(0, actualPrice - depositAmountNum);

  const onSubmit = async (data: CreateOrderFormData) => {
    setServerError(null);
    setIsConflictError(false);
    try {
      await createOrderMutation.mutateAsync({
        customer_id: data.customer_id,
        vehicle_id: data.vehicle_id,
        total_amount: data.total_amount,
        discount_amount: data.discount_amount || '0',
        deposit_amount: data.deposit_amount || '0',
      });

      reset();
      setOpen(false);
    } catch (err) {
      const axiosErr = err as AxiosError<{ message?: string; error?: string }>;
      const status = axiosErr.response?.status;
      const errMsg =
        axiosErr.response?.data?.message ||
        axiosErr.response?.data?.error ||
        axiosErr.message ||
        '';

      // 2. Tinh chỉnh 2: Xử lý mượt mà lỗi tranh chấp Race Condition (409 Conflict)
      if (status === 409 || errMsg.toLowerCase().includes('already reserved') || errMsg.toLowerCase().includes('conflict')) {
        setIsConflictError(true);
        setServerError(
          'Rất tiếc! Chiếc xe với số VIN này vừa được một nhân viên khác lên đơn và khóa cọc cách đây vài giây. Vui lòng chọn số VIN khác!'
        );
        // Tự động làm mới kho xe và xóa số VIN vừa chọn
        queryClient.invalidateQueries({ queryKey: ['vehicles'] });
        setValue('vehicle_id', '', { shouldValidate: true });
      } else {
        setServerError(errMsg || 'Lỗi khi khởi tạo đơn bán xe');
      }
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="brand" size="sm" className="shadow-sm">
          <Plus className="h-4 w-4 mr-1.5" />
          Lên Đơn Bán Xe Mới
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-slate-900">
            <ShoppingBag className="h-5 w-5 text-blue-600" />
            Lên Hợp Đồng Đơn Bán Xe Mới
          </DialogTitle>
          <DialogDescription className="text-xs text-slate-500">
            Khóa xe vật lý trong kho (chuyển sang RESERVED), áp dụng chiết khấu và tự động tính toán số dư thanh toán.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-2">
          {serverError && (
            <div
              className={`flex items-start gap-2.5 rounded-xl border p-3 text-xs animate-in fade-in slide-in-from-top-1 ${
                isConflictError
                  ? 'border-amber-300 bg-amber-50 text-amber-800 font-medium'
                  : 'border-rose-200 bg-rose-50/80 text-rose-700'
              }`}
            >
              {isConflictError ? (
                <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5 text-amber-600" />
              ) : (
                <ShieldAlert className="h-4 w-4 shrink-0 mt-0.5" />
              )}
              <span>{serverError}</span>
            </div>
          )}

          {/* Khách hàng ký hợp đồng */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700">
              Khách Hàng Ký Hợp Đồng *
            </label>
            <Controller
              name="customer_id"
              control={control}
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger className={errors.customer_id ? 'border-rose-500' : ''}>
                    <SelectValue placeholder="Chọn khách hàng..." />
                  </SelectTrigger>
                  <SelectContent>
                    {customers.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name} - SĐT: {c.phone} ({c.type === 'ENTERPRISE' ? 'Doanh nghiệp' : 'Cá nhân'})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {errors.customer_id && (
              <p className="text-[11px] font-medium text-rose-500">{errors.customer_id.message}</p>
            )}
          </div>

          {/* Dependent Dropdown: Model -> VIN IN_STOCK */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700">
                1. Dòng Xe (Model) *
              </label>
              <Controller
                name="model_id"
                control={control}
                render={({ field }) => (
                  <Select value={field.value} onValueChange={handleModelChange}>
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
                2. Xe Cụ Thể Trong Kho (VIN) *
              </label>
              <Controller
                name="vehicle_id"
                control={control}
                render={({ field }) => (
                  <Select
                    value={field.value}
                    onValueChange={field.onChange}
                    disabled={!selectedModelId || availableVehiclesForModel.length === 0}
                  >
                    <SelectTrigger className={errors.vehicle_id ? 'border-rose-500' : ''}>
                      <SelectValue
                        placeholder={
                          !selectedModelId
                            ? 'Chọn Model trước...'
                            : availableVehiclesForModel.length === 0
                            ? 'Hết xe sẵn sàng bán'
                            : 'Chọn số VIN xe...'
                        }
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {availableVehiclesForModel.map((v) => (
                        <SelectItem key={v.id} value={v.id}>
                          VIN: {formatVIN(v.vin)} {v.color_exterior && `(${v.color_exterior})`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.vehicle_id && (
                <p className="text-[11px] font-medium text-rose-500">{errors.vehicle_id.message}</p>
              )}
            </div>
          </div>

          {/* Thẻ hiển thị tóm tắt xe khi đã chọn VIN */}
          {currentSelectedVehicle && (
            <div className="flex items-center gap-3 rounded-xl border border-blue-100 bg-blue-50/60 p-3 text-xs">
              <Car className="h-5 w-5 text-blue-600 shrink-0" />
              <div className="flex-1">
                <div className="font-bold text-slate-900">
                  Số VIN: <span className="font-mono text-blue-600">{currentSelectedVehicle.vin}</span>
                </div>
                <div className="mt-0.5 text-[11px] text-slate-600">
                  Màu ngoại thất: <span className="font-semibold">{currentSelectedVehicle.color_exterior || 'Chưa rõ'}</span> | Số máy: <span className="font-mono">{currentSelectedVehicle.engine_number || '-'}</span>
                </div>
              </div>
            </div>
          )}

          {/* Giá trị tài chính đơn hàng */}
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700">
                Tổng Giá Bán (VND) *
              </label>
              <Controller
                name="total_amount"
                control={control}
                render={({ field }) => (
                  <CurrencyInput
                    value={field.value}
                    onValueChange={field.onChange}
                    placeholder="1,200,000,000"
                    className={errors.total_amount ? 'border-rose-500' : ''}
                  />
                )}
              />
              {errors.total_amount && (
                <p className="text-[11px] font-medium text-rose-500">{errors.total_amount.message}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700">
                Chiết Khấu (VND)
              </label>
              <Controller
                name="discount_amount"
                control={control}
                render={({ field }) => (
                  <CurrencyInput
                    value={field.value}
                    onValueChange={field.onChange}
                    placeholder="0"
                  />
                )}
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700">
                Tiền Đặt Cọc (VND)
              </label>
              <Controller
                name="deposit_amount"
                control={control}
                render={({ field }) => (
                  <CurrencyInput
                    value={field.value}
                    onValueChange={field.onChange}
                    placeholder="50,000,000"
                  />
                )}
              />
            </div>
          </div>

          {/* 3. Tinh chỉnh 3: Thẻ Tóm Tắt Tài Chính Tự Động (Smart Financial Summary Card) */}
          {totalAmountNum > 0 && (
            <div className="rounded-xl border border-slate-200 bg-slate-50/90 p-3.5 space-y-2">
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
                <Calculator className="h-4 w-4 text-blue-600" />
                <span>Bảng Tóm Tắt Quyết Toán Hợp Đồng</span>
              </div>
              <div className="grid grid-cols-3 gap-2 text-xs pt-1 border-t border-slate-200/80">
                <div>
                  <span className="text-[10px] text-slate-500 block">Giá sau chiết khấu:</span>
                  <span className="font-bold text-slate-900">{formatVND(actualPrice)}</span>
                </div>
                <div>
                  <span className="text-[10px] text-blue-600 block font-semibold">Tiền cọc nhận trước:</span>
                  <span className="font-bold text-blue-600">{formatVND(depositAmountNum)}</span>
                </div>
                <div>
                  <span className="text-[10px] text-emerald-600 block font-semibold">Còn lại cần thanh toán:</span>
                  <span className="font-extrabold text-emerald-600 text-sm">{formatVND(remainingAmount)}</span>
                </div>
              </div>
            </div>
          )}

          <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
            <Info className="h-3.5 w-3.5 text-blue-500" />
            <span>Khi tạo đơn, chiếc xe sẽ chuyển trạng thái sang <span className="font-semibold text-amber-600">RESERVED</span> (Khóa xe).</span>
          </div>

          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Hủy
            </Button>
            <Button
              type="submit"
              variant="brand"
              isLoading={isSubmitting || createOrderMutation.isPending}
            >
              <CheckCircle2 className="mr-1.5 h-4 w-4" />
              Tạo Hợp Đồng & Khóa Xe
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
