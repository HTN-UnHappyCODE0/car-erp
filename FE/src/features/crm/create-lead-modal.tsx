'use client';

import React, { useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
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
import { PhoneInput } from '@/shared/components/ui/phone-input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/components/ui/select';
import { useCreateLead } from '@/entities/lead';
import { useVehicleModels } from '@/entities/vehicle';
import { UserPlus, Sparkles, ShieldAlert, CheckCircle2 } from 'lucide-react';

const createLeadSchema = z.object({
  customer_name: z.string().min(2, 'Họ tên khách hàng tối thiểu 2 ký tự'),
  customer_phone: z
    .string()
    .min(9, 'Số điện thoại không hợp lệ')
    .regex(/^(0|\+84)[3|5|7|8|9][0-9]{8}$/, 'Số điện thoại di động Việt Nam không đúng định dạng'),
  interested_model_id: z.string().optional(),
  campaign_id: z.string().optional(),
  notes: z.string().optional(),
});

type CreateLeadFormData = z.infer<typeof createLeadSchema>;

export function CreateLeadModal() {
  const [open, setOpen] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const { data: models = [] } = useVehicleModels();
  const createLeadMutation = useCreateLead();

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CreateLeadFormData>({
    resolver: zodResolver(createLeadSchema),
    defaultValues: {
      customer_name: '',
      customer_phone: '',
      interested_model_id: '',
      campaign_id: '',
      notes: '',
    },
  });

  const onSubmit = async (data: CreateLeadFormData) => {
    setServerError(null);
    try {
      await createLeadMutation.mutateAsync({
        customer_name: data.customer_name.trim(),
        customer_phone: data.customer_phone.trim(),
        interested_model_id: data.interested_model_id || undefined,
        campaign_id: data.campaign_id || undefined,
        notes: data.notes?.trim() || undefined,
      });

      reset();
      setOpen(false);
    } catch (err) {
      const axiosErr = err as AxiosError<{ message?: string; error?: string }>;
      setServerError(
        axiosErr.response?.data?.message ||
          axiosErr.response?.data?.error ||
          axiosErr.message ||
          'Lỗi khi tiếp nhận cơ hội bán hàng'
      );
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="brand" size="sm" className="shadow-sm">
          <UserPlus className="h-4 w-4 mr-1.5" />
          Tiếp Nhận Lead Mới
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-slate-900">
            <Sparkles className="h-5 w-5 text-blue-600" />
            Tiếp Nhận Cơ Hội Bán Hàng (Lead)
          </DialogTitle>
          <DialogDescription className="text-xs text-slate-500">
            Khởi tạo Lead vào phễu bán hàng (State Machine), liên kết mẫu xe và phân công tư vấn.
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
              Số Điện Thoại Khách Hàng (Di Động VN) *
            </label>
            <Controller
              name="customer_phone"
              control={control}
              render={({ field }) => (
                <PhoneInput
                  value={field.value}
                  onValueChange={field.onChange}
                  placeholder="098 123 4567"
                  className={errors.customer_phone ? 'border-rose-500' : ''}
                />
              )}
            />
            {errors.customer_phone && (
              <p className="text-[11px] font-medium text-rose-500">{errors.customer_phone.message}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700">
              Họ & Tên Khách Hàng *
            </label>
            <Input
              {...register('customer_name')}
              placeholder="VD: Nguyễn Văn Anh"
              className={errors.customer_name ? 'border-rose-500' : ''}
            />
            {errors.customer_name && (
              <p className="text-[11px] font-medium text-rose-500">{errors.customer_name.message}</p>
            )}
          </div>

          {/* Cross-Module Linking với Vehicle Models của Inventory */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700">
              Dòng Xe Khách Quan Tâm
            </label>
            <Controller
              name="interested_model_id"
              control={control}
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Chọn dòng xe quan tâm..." />
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
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700">
              Nguồn Cơ Hội / Chiến Dịch
            </label>
            <Controller
              name="campaign_id"
              control={control}
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Nguồn tiếp nhận..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="SHOWROOM_VISIT">Khách Vãng Lai Showroom</SelectItem>
                    <SelectItem value="HOTLINE">Hotline Đại Lý</SelectItem>
                    <SelectItem value="WEBSITE">Website & Form Đăng Ký</SelectItem>
                    <SelectItem value="FACEBOOK_ADS">Quảng Cáo Mạng Xã Hội</SelectItem>
                    <SelectItem value="REFERRAL">Người Quen Giới Thiệu</SelectItem>
                  </SelectContent>
                </Select>
              )}
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700">
              Ghi Chú Nhu Cầu Của Khách
            </label>
            <textarea
              {...register('notes')}
              className="flex min-h-[72px] w-full rounded-xl border border-slate-200 bg-white p-3 text-xs placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Nhu cầu: Muốn lái thử bản 2.5Q màu đen vào T7, dự kiến vay ngân hàng 70%..."
            />
          </div>

          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Hủy
            </Button>
            <Button
              type="submit"
              variant="brand"
              isLoading={isSubmitting || createLeadMutation.isPending}
            >
              <CheckCircle2 className="mr-1.5 h-4 w-4" />
              Lưu Vào Phễu Bán Hàng
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
