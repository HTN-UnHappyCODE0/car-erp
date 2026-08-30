'use client';

import React, { useState, useMemo } from 'react';
import { useForm, Controller, useFieldArray, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/components/ui/select';
import { useCreateRepairOrder, useAddRepairOrderItem, useVehicleServiceHistory } from '@/entities/repair-order';
import { useCustomers } from '@/entities/customer';
import { useVehicles } from '@/entities/vehicle';
import { useAuthStore } from '@/shared/store/auth-store';
import { RepairItemRow } from './repair-item-row';
import { VehicleHistoryDrawer } from './vehicle-history-drawer';
import { formatVND, formatVIN } from '@/shared/lib/utils';
import {
  Wrench,
  Plus,
  ShieldAlert,
  History,
  AlertTriangle,
  CheckCircle2,
  Lock,
  PlusCircle,
  Gauge,
} from 'lucide-react';
import { AxiosError } from 'axios';

const repairItemSchema = z.object({
  item_type: z.enum(['PART', 'LABOR']),
  item_name: z.string().min(1, 'Vui lòng nhập tên hạng mục / phụ tùng'),
  quantity: z.number().min(1, 'Số lượng tối thiểu là 1'),
  unit_price: z.string().min(1, 'Vui lòng nhập đơn giá'),
});

const createRepairSchema = z
  .object({
    customer_id: z.string().min(1, 'Vui lòng chọn khách hàng'),
    vehicle_id: z.string().min(1, 'Vui lòng chọn xe tiếp nhận'),
    odometer: z.number().min(0, 'Số ODO không hợp lệ'),
    symptoms: z.string().min(3, 'Vui lòng ghi nhận hiện trạng / triệu chứng của xe'),
    override_odometer: z.boolean(),
    override_reason: z.string().optional(),
    items: z.array(repairItemSchema),
  })
  .superRefine((data, ctx) => {
    if (data.override_odometer && (!data.override_reason || data.override_reason.trim().length < 5)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['override_reason'],
        message: 'Bắt buộc nhập lý do giải trình khi mở khóa điều chỉnh ODO (tối thiểu 5 ký tự)',
      });
    }
  });

export type CreateRepairFormData = z.infer<typeof createRepairSchema>;

export function CreateRepairModal() {
  const [open, setOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const { user } = useAuthStore();
  const isMechanic = user?.role === 'mechanic';

  const { data: customers = [] } = useCustomers();
  const { data: vehicles = [] } = useVehicles();
  const createRepairMutation = useCreateRepairOrder();
  const addItemMutation = useAddRepairOrderItem();

  const {
    handleSubmit,
    control,
    setValue,
    setError,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CreateRepairFormData>({
    resolver: zodResolver(createRepairSchema),
    defaultValues: {
      customer_id: '',
      vehicle_id: '',
      odometer: 0,
      symptoms: '',
      override_odometer: false,
      override_reason: '',
      items: [{ item_type: 'PART', item_name: '', quantity: 1, unit_price: '0' }],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'items',
  });

  const selectedVehicleId = useWatch({ control, name: 'vehicle_id' });
  const enteredOdometer = useWatch({ control, name: 'odometer' }) || 0;
  const isOverrideChecked = useWatch({ control, name: 'override_odometer' });
  const watchedItems = useWatch({ control, name: 'items' });

  // 1. Tra cứu lịch sử xe để tìm số ODO lớn nhất ghi nhận trước đó (Odometer Guard)
  const { data: vehicleHistory = [] } = useVehicleServiceHistory(selectedVehicleId || '');

  const lastOdometer = useMemo(() => {
    if (!vehicleHistory || vehicleHistory.length === 0) return 0;
    return Math.max(...vehicleHistory.map((h) => h.odometer || 0));
  }, [vehicleHistory]);

  const selectedVehicle = useMemo(() => {
    return vehicles.find((v) => v.id === selectedVehicleId);
  }, [vehicles, selectedVehicleId]);

  const isOdometerSuspicious = lastOdometer > 0 && enteredOdometer < lastOdometer;

  // 3. Tự động tính toán tổng chi phí ước tính thời gian thực
  const estimatedTotal = useMemo(() => {
    const list = watchedItems || [];
    return list.reduce((sum, it) => {
      const q = it?.quantity || 0;
      const p = parseFloat(it?.unit_price || '0') || 0;
      return sum + q * p;
    }, 0);
  }, [watchedItems]);

  const handleAutoAppend = () => {
    append({ item_type: 'PART', item_name: '', quantity: 1, unit_price: '0' });
  };

  const handleClose = () => {
    reset();
    setServerError(null);
    setOpen(false);
  };

  const onSubmit = async (data: CreateRepairFormData) => {
    // 2. Chặn tua ODO nếu chưa tích chọn Override
    if (isOdometerSuspicious && !data.override_odometer) {
      setError('odometer', {
        type: 'manual',
        message: `Số ODO (${data.odometer.toLocaleString('vi-VN')} km) nhỏ hơn lần sửa chữa trước (${lastOdometer.toLocaleString('vi-VN')} km). Cảnh báo tua lùi công-tơ-mét!`,
      });
      return;
    }

    setServerError(null);
    try {
      // 1. Tạo lệnh sửa chữa
      const newOrder = await createRepairMutation.mutateAsync({
        customer_id: data.customer_id,
        vehicle_id: data.vehicle_id,
        odometer: data.odometer,
        symptoms: data.symptoms.trim(),
        override_odometer: data.override_odometer,
        override_reason: data.override_odometer ? data.override_reason?.trim() : undefined,
      });

      // 2. Lưu các hạng mục vật tư / công thợ đã nhập
      const validItems = data.items.filter((it) => it.item_name.trim().length > 0);
      for (const item of validItems) {
        await addItemMutation.mutateAsync({
          id: newOrder.id,
          data: {
            item_type: item.item_type,
            item_name: item.item_name.trim(),
            quantity: item.quantity,
            unit_price: item.unit_price,
          },
        });
      }

      handleClose();
    } catch (err) {
      const axiosErr = err as AxiosError<{ message?: string; error?: string }>;
      setServerError(
        axiosErr.response?.data?.message ||
          axiosErr.response?.data?.error ||
          axiosErr.message ||
          'Lỗi khi tiếp nhận xe vào xưởng'
      );
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={(val) => (!val ? handleClose() : setOpen(val))}>
        <DialogTrigger asChild>
          <Button variant="brand" size="sm" className="shadow-sm">
            <Plus className="h-4 w-4 mr-1.5" />
            Tiếp Nhận Xe Vào Xưởng
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-slate-900">
              <Wrench className="h-5 w-5 text-blue-600" />
              Mở Lệnh Tiếp Nhận Sửa Chữa (Repair Order)
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Kiểm soát số Odometer chống tua lùi, kê khai bóc tách vật tư phụ tùng và tiền công thợ kỹ thuật.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-2">
            {serverError && (
              <div className="flex items-start gap-2.5 rounded-xl border border-rose-200 bg-rose-50/80 p-3 text-xs text-rose-700">
                <ShieldAlert className="h-4 w-4 shrink-0 mt-0.5" />
                <span>{serverError}</span>
              </div>
            )}

            {/* Khách hàng & Chọn Xe */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700">
                  Khách Hàng Đưa Xe Vào *
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
                            {c.name} - SĐT: {c.phone}
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

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-slate-700">
                    Xe Tiếp Nhận (Số VIN) *
                  </label>
                  {selectedVehicleId && (
                    <button
                      type="button"
                      onClick={() => setHistoryOpen(true)}
                      className="flex items-center gap-1 text-[11px] font-semibold text-blue-600 hover:text-blue-700"
                    >
                      <History className="h-3.5 w-3.5" />
                      Lịch sử xe ({vehicleHistory.length})
                    </button>
                  )}
                </div>
                <Controller
                  name="vehicle_id"
                  control={control}
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger className={errors.vehicle_id ? 'border-rose-500' : ''}>
                        <SelectValue placeholder="Chọn số VIN xe..." />
                      </SelectTrigger>
                      <SelectContent>
                        {vehicles.map((v) => (
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

            {/* Odometer Guard Section */}
            <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-3.5 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Gauge className="h-4 w-4 text-blue-600" />
                  <span className="text-xs font-bold text-slate-800">
                    Kiểm Soát Odometer (Chống Tua Lùi Công-Tơ-Mét)
                  </span>
                </div>
                {lastOdometer > 0 && (
                  <span className="text-[11px] text-slate-500">
                    Lần sửa gần nhất: <span className="font-mono font-bold text-slate-800">{lastOdometer.toLocaleString('vi-VN')} km</span>
                  </span>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-start">
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-slate-700">
                    Số KM Thực Tế Lúc Vào Xưởng (km) *
                  </label>
                  <Controller
                    name="odometer"
                    control={control}
                    render={({ field }) => (
                      <Input
                        type="number"
                        min={0}
                        placeholder="VD: 45000"
                        value={field.value || ''}
                        onChange={(e) => field.onChange(parseInt(e.target.value, 10) || 0)}
                        className={`font-mono text-xs ${
                          isOdometerSuspicious && !isOverrideChecked ? 'border-rose-500 bg-rose-50/40 text-rose-700' : ''
                        }`}
                      />
                    )}
                  />
                  {errors.odometer && (
                    <p className="text-[11px] font-bold text-rose-600">{errors.odometer.message}</p>
                  )}
                </div>

                {/* Cảnh báo tua ODO & Manager Override Checkbox */}
                {isOdometerSuspicious && (
                  <div className="rounded-xl border border-rose-300 bg-rose-50 p-2.5 space-y-2">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-rose-700">
                      <AlertTriangle className="h-4 w-4 shrink-0" />
                      <span>Cảnh báo tua lùi ODO ({enteredOdometer} &lt; {lastOdometer} km)</span>
                    </div>

                    <label className="flex items-start gap-2 text-[11px] font-medium text-slate-700 cursor-pointer">
                      <input
                        type="checkbox"
                        className="mt-0.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                        checked={isOverrideChecked}
                        onChange={(e) => setValue('override_odometer', e.target.checked, { shouldValidate: true })}
                      />
                      <span>Mở khóa ghi đè ODO (Chỉ dành cho Quản lý / Thay đồng hồ taplo)</span>
                    </label>

                    {isOverrideChecked && (
                      <Controller
                        name="override_reason"
                        control={control}
                        render={({ field }) => (
                          <Input
                            {...field}
                            placeholder="Nhập lý do giải trình bắt buộc..."
                            className="h-7 text-xs bg-white"
                          />
                        )}
                      />
                    )}
                    {errors.override_reason && (
                      <p className="text-[10px] font-semibold text-rose-600">{errors.override_reason.message}</p>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Hiện trạng & Triệu chứng */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700">
                Hiện Trạng & Yêu Cầu Của Khách Hàng *
              </label>
              <Controller
                name="symptoms"
                control={control}
                render={({ field }) => (
                  <textarea
                    {...field}
                    className="flex min-h-[64px] w-full rounded-xl border border-slate-200 bg-white p-3 text-xs placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Bảo dưỡng định kỳ cấp 40.000km, kiểm tra phanh trước kêu rít..."
                  />
                )}
              />
              {errors.symptoms && (
                <p className="text-[11px] font-medium text-rose-500">{errors.symptoms.message}</p>
              )}
            </div>

            {/* Dynamic Field Array (Phụ Tùng & Tiền Công) */}
            <div className="space-y-2 pt-1">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
                  <Wrench className="h-4 w-4 text-blue-600" />
                  <span>Bóc Tách Vật Tư & Tiền Công Thợ ({fields.length} hạng mục)</span>
                  {isMechanic && (
                    <span className="flex items-center gap-0.5 rounded-md bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-500 font-semibold">
                      <Lock className="h-3 w-3" /> Khóa giá Thợ máy
                    </span>
                  )}
                </div>

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs"
                  onClick={handleAutoAppend}
                >
                  <PlusCircle className="mr-1 h-3.5 w-3.5" />
                  Thêm hạng mục (Enter)
                </Button>
              </div>

              <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                {fields.map((field, idx) => (
                  <RepairItemRow
                    key={field.id}
                    index={idx}
                    control={control}
                    isPriceLocked={isMechanic}
                    isLastRow={idx === fields.length - 1}
                    onRemove={remove}
                    onAutoAppend={handleAutoAppend}
                  />
                ))}
              </div>

              {/* Tóm tắt tổng chi phí ước tính */}
              <div className="flex items-center justify-between rounded-xl bg-slate-100 p-3 text-xs font-semibold">
                <span className="text-slate-600">Tổng chi phí ước tính:</span>
                <span className="font-mono font-black text-sm text-emerald-600">
                  {formatVND(estimatedTotal)}
                </span>
              </div>
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={handleClose}>
                Hủy
              </Button>
              <Button
                type="submit"
                variant="brand"
                isLoading={isSubmitting || createRepairMutation.isPending}
              >
                <CheckCircle2 className="mr-1.5 h-4 w-4" />
                Mở Lệnh & Tiếp Nhận Xe
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Vehicle History Drawer */}
      <VehicleHistoryDrawer
        vehicleId={selectedVehicleId}
        vehicleVin={selectedVehicle?.vin}
        open={historyOpen}
        onOpenChange={setHistoryOpen}
      />
    </>
  );
}
