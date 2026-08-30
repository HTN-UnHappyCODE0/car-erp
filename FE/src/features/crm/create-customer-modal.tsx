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
import { useCreateCustomer, CustomerType } from '@/entities/customer';
import { Plus, UserPlus, ShieldAlert, CheckCircle2 } from 'lucide-react';

const createCustomerSchema = z.object({
  name: z.string().min(2, 'Họ tên khách hàng tối thiểu 2 ký tự'),
  type: z.enum(['INDIVIDUAL', 'ENTERPRISE']),
  phone: z
    .string()
    .min(9, 'Số điện thoại không hợp lệ')
    .regex(/^(0|\+84)[3|5|7|8|9][0-9]{8}$/, 'Số điện thoại di động Việt Nam không đúng định dạng'),
  email: z.string().email('Email không đúng định dạng').optional().or(z.literal('')),
  id_card_number: z.string().optional(),
  address: z.string().optional(),
});

type CreateCustomerFormData = z.infer<typeof createCustomerSchema>;

export function CreateCustomerModal() {
  const [open, setOpen] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const createCustomerMutation = useCreateCustomer();

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CreateCustomerFormData>({
    resolver: zodResolver(createCustomerSchema),
    defaultValues: {
      name: '',
      type: 'INDIVIDUAL',
      phone: '',
      email: '',
      id_card_number: '',
      address: '',
    },
  });

  const onSubmit = async (data: CreateCustomerFormData) => {
    setServerError(null);
    try {
      await createCustomerMutation.mutateAsync({
        name: data.name.trim(),
        type: data.type as CustomerType,
        phone: data.phone.trim(),
        email: data.email?.trim() || undefined,
        id_card_number: data.id_card_number?.trim() || undefined,
        address: data.address?.trim() || undefined,
      });

      reset();
      setOpen(false);
    } catch (err) {
      const axiosErr = err as AxiosError<{ message?: string; error?: string }>;
      setServerError(
        axiosErr.response?.data?.message ||
          axiosErr.response?.data?.error ||
          axiosErr.message ||
          'Lỗi khi thêm khách hàng'
      );
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Plus className="h-4 w-4 mr-1.5" />
          Thêm Khách Hàng
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-slate-900">
            <UserPlus className="h-5 w-5 text-blue-600" />
            Tạo Hồ Sơ Khách Hàng Mới
          </DialogTitle>
          <DialogDescription className="text-xs text-slate-500">
            Lưu danh bạ khách hàng cá nhân hoặc doanh nghiệp để tra cứu và lập cơ hội bán xe.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-2">
          {serverError && (
            <div className="flex items-start gap-2.5 rounded-xl border border-rose-200 bg-rose-50/80 p-3 text-xs text-rose-700">
              <ShieldAlert className="h-4 w-4 shrink-0 mt-0.5" />
              <span>{serverError}</span>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700">
                Loại Khách Hàng *
              </label>
              <Controller
                name="type"
                control={control}
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="INDIVIDUAL">Cá Nhân</SelectItem>
                      <SelectItem value="ENTERPRISE">Doanh Nghiệp</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700">
                Số Điện Thoại (Di Động VN) *
              </label>
              <Controller
                name="phone"
                control={control}
                render={({ field }) => (
                  <PhoneInput
                    value={field.value}
                    onValueChange={field.onChange}
                    placeholder="098 123 4567"
                    className={errors.phone ? 'border-rose-500' : ''}
                  />
                )}
              />
              {errors.phone && (
                <p className="text-[11px] font-medium text-rose-500">{errors.phone.message}</p>
              )}
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700">
              Họ và Tên / Tên Công Ty *
            </label>
            <Input
              {...register('name')}
              placeholder="VD: Nguyễn Văn An / Công ty TNHH Ánh Dương"
              className={errors.name ? 'border-rose-500' : ''}
            />
            {errors.name && (
              <p className="text-[11px] font-medium text-rose-500">{errors.name.message}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700">
                CCCD / Mã Số Thuế
              </label>
              <Input
                {...register('id_card_number')}
                placeholder="VD: 001201012345"
                className="font-mono"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700">
                Email
              </label>
              <Input
                {...register('email')}
                type="email"
                placeholder="khachhang@gmail.com"
                className={errors.email ? 'border-rose-500' : ''}
              />
              {errors.email && (
                <p className="text-[11px] font-medium text-rose-500">{errors.email.message}</p>
              )}
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700">
              Địa Chỉ Thường Trú / Trụ Sở
            </label>
            <Input
              {...register('address')}
              placeholder="Số nhà, đường, quận huyện, tỉnh thành..."
            />
          </div>

          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Hủy
            </Button>
            <Button
              type="submit"
              variant="brand"
              isLoading={isSubmitting || createCustomerMutation.isPending}
            >
              <CheckCircle2 className="mr-1.5 h-4 w-4" />
              Lưu Khách Hàng
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
