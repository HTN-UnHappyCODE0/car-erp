'use client';

import React, { useMemo } from 'react';
import { useForm, Controller, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/shared/components/ui/dialog';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { CurrencyInput } from '@/shared/components/ui/currency-input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/components/ui/select';
import { useCreatePayment, Invoice, PaymentMethod } from '@/entities/invoice';
import { DollarSign, ShieldAlert, CheckCircle2, Calculator, Lock } from 'lucide-react';
import { formatVND } from '@/shared/lib/utils';
import { AxiosError } from 'axios';

interface Props {
  invoice: Invoice | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreatePaymentDialog({ invoice, open, onOpenChange }: Props) {
  const createPaymentMutation = useCreatePayment();
  const [serverError, setServerError] = React.useState<string | null>(null);

  // 1. Tính toán số dư nợ còn lại (remainingAmount)
  const totalAmount = invoice ? parseFloat(invoice.amount) || 0 : 0;
  const paidAmount = invoice?.transactions
    ? invoice.transactions
        .filter((t) => t.status === 'COMPLETED')
        .reduce((sum, t) => sum + parseFloat(t.amount || '0'), 0)
    : 0;
  const remainingAmount = Math.max(0, totalAmount - paidAmount);

  // 1. Tinh chỉnh 1: Dynamic Zod Schema chặn thu lố số tiền còn nợ
  const paymentSchema = useMemo(() => {
    return z
      .object({
        payment_method: z.enum(['BANK_TRANSFER', 'CASH', 'INSTALLMENT', 'CREDIT_CARD'] as const, {
          message: 'Vui lòng chọn phương thức thanh toán',
        }),
        amount: z
          .string()
          .min(1, 'Vui lòng nhập số tiền thanh toán')
          .refine((val) => !isNaN(Number(val)) && Number(val) > 0, {
            message: 'Số tiền thanh toán phải lớn hơn 0',
          })
          .refine((val) => Number(val) <= remainingAmount, {
            message: `Số tiền thu không được vượt quá số nợ còn lại (${formatVND(remainingAmount)})`,
          }),
        reference_code: z.string().optional(),
        note: z.string().optional(),
      })
      .superRefine((data, ctx) => {
        // Bắt buộc nhập mã tham chiếu nếu chuyển khoản hoặc trả góp hoặc thẻ
        if (
          (data.payment_method === 'BANK_TRANSFER' ||
            data.payment_method === 'INSTALLMENT' ||
            data.payment_method === 'CREDIT_CARD') &&
          (!data.reference_code || data.reference_code.trim().length === 0)
        ) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['reference_code'],
            message: 'Bắt buộc nhập mã giao dịch ngân hàng / mã đối soát sao kê',
          });
        }
      });
  }, [remainingAmount]);

  type PaymentFormData = z.infer<typeof paymentSchema>;

  const {
    handleSubmit,
    control,
    setError,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<PaymentFormData>({
    resolver: zodResolver(paymentSchema),
    defaultValues: {
      payment_method: 'BANK_TRANSFER',
      amount: remainingAmount > 0 ? remainingAmount.toString() : '',
      reference_code: '',
      note: '',
    },
  });

  const paymentMethod = useWatch({ control, name: 'payment_method' });
  const amountStr = useWatch({ control, name: 'amount' }) || '0';

  const amountNum = parseFloat(amountStr) || 0;
  const nextRemaining = Math.max(0, remainingAmount - amountNum);

  const handleClose = () => {
    reset();
    setServerError(null);
    onOpenChange(false);
  };

  const onSubmit = async (data: PaymentFormData) => {
    if (!invoice) return;
    setServerError(null);

    try {
      await createPaymentMutation.mutateAsync({
        invoiceId: invoice.id,
        data: {
          payment_method: data.payment_method as PaymentMethod,
          amount: data.amount,
          reference_code: data.reference_code?.trim() || undefined,
          note: data.note?.trim() || undefined,
        },
      });

      handleClose();
    } catch (err) {
      const axiosErr = err as AxiosError<{ message?: string; error?: string }>;
      const errMsg =
        axiosErr.response?.data?.message ||
        axiosErr.response?.data?.error ||
        axiosErr.message ||
        '';

      // 3. Tinh chỉnh 3: Chỉ điểm lỗi mã đối soát (Idempotency Error Mapping)
      if (
        errMsg.toLowerCase().includes('reference_code') ||
        errMsg.toLowerCase().includes('duplicate') ||
        errMsg.toLowerCase().includes('already exists') ||
        axiosErr.response?.status === 409
      ) {
        setError('reference_code', {
          type: 'manual',
          message: 'Mã giao dịch ngân hàng này đã tồn tại trong hệ thống. Vui lòng kiểm tra lại sao kê!',
        });
      } else {
        setServerError(errMsg || 'Lỗi khi ghi nhận giao dịch thu tiền');
      }
    }
  };

  return (
    <Dialog open={open} onOpenChange={(val) => (!val ? handleClose() : onOpenChange(val))}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-slate-900">
            <DollarSign className="h-5 w-5 text-emerald-600" />
            Ghi Nhận Thu Tiền / Phiếu Thu Kế Toán
          </DialogTitle>
          <DialogDescription className="text-xs text-slate-500">
            Ghi nhận dòng tiền thực tế vào tài khoản đại lý và tự động cập nhật công nợ hóa đơn.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-2">
          {serverError && (
            <div className="flex items-start gap-2.5 rounded-xl border border-rose-200 bg-rose-50/80 p-3 text-xs text-rose-700">
              <ShieldAlert className="h-4 w-4 shrink-0 mt-0.5" />
              <span>{serverError}</span>
            </div>
          )}

          {/* Thông tin hóa đơn & Dư nợ */}
          <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-3.5">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                  Số Hóa Đơn
                </span>
                <div className="font-mono text-sm font-bold text-slate-900">
                  {invoice?.invoice_number}
                </div>
              </div>
              <div className="text-right">
                <span className="text-[10px] uppercase font-bold text-rose-500 tracking-wider">
                  Dư Nợ Còn Lại
                </span>
                <div className="font-mono text-sm font-extrabold text-rose-600">
                  {formatVND(remainingAmount)}
                </div>
              </div>
            </div>
          </div>

          {/* Phương thức thanh toán */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700">
              Phương Thức Thanh Toán *
            </label>
            <Controller
              name="payment_method"
              control={control}
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger className={errors.payment_method ? 'border-rose-500' : ''}>
                    <SelectValue placeholder="Chọn phương thức..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="BANK_TRANSFER">Chuyển khoản Ngân hàng (BANK_TRANSFER)</SelectItem>
                    <SelectItem value="CASH">Tiền mặt tại Quầy (CASH)</SelectItem>
                    <SelectItem value="INSTALLMENT">Hồ sơ Trả góp Ngân hàng (INSTALLMENT)</SelectItem>
                    <SelectItem value="CREDIT_CARD">Thẻ Tín Dụng / POS (CREDIT_CARD)</SelectItem>
                  </SelectContent>
                </Select>
              )}
            />
            {errors.payment_method && (
              <p className="text-[11px] font-medium text-rose-500">{errors.payment_method.message}</p>
            )}
          </div>

          {/* Số tiền thanh toán (Dynamic Max) */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-700">
                Số Tiền Thanh Toán (VND) *
              </label>
              <span className="text-[10px] text-slate-500">
                Tối đa: <span className="font-semibold text-rose-600">{formatVND(remainingAmount)}</span>
              </span>
            </div>
            <Controller
              name="amount"
              control={control}
              render={({ field }) => (
                <CurrencyInput
                  value={field.value}
                  onValueChange={field.onChange}
                  placeholder="50,000,000"
                  className={errors.amount ? 'border-rose-500 focus:ring-rose-500' : ''}
                />
              )}
            />
            {errors.amount && (
              <p className="text-[11px] font-medium text-rose-500">{errors.amount.message}</p>
            )}
          </div>

          {/* Mã giao dịch ngân hàng / Mã đối soát (Idempotency Key) */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700 flex items-center justify-between">
              <span className="flex items-center gap-1">
                <Lock className="h-3.5 w-3.5 text-blue-600" />
                Mã Giao Dịch Ngân Hàng / Mã Đối Soát (Idempotency Key)
                {paymentMethod !== 'CASH' && <span className="text-rose-500">*</span>}
              </span>
              <span className="text-[10px] font-normal text-slate-400">Chống thu trùng lặp</span>
            </label>
            <Controller
              name="reference_code"
              control={control}
              render={({ field }) => (
                <Input
                  {...field}
                  placeholder="VD: FT260830998822 hoặc VCB-POS-1234"
                  className={`font-mono text-xs ${
                    errors.reference_code ? 'border-rose-500 bg-rose-50/40' : ''
                  }`}
                />
              )}
            />
            {errors.reference_code && (
              <p className="text-[11px] font-bold text-rose-600 animate-in fade-in">
                {errors.reference_code.message}
              </p>
            )}
          </div>

          {/* Ghi chú */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700">
              Ghi Chú Giao Dịch
            </label>
            <Controller
              name="note"
              control={control}
              render={({ field }) => (
                <Input
                  {...field}
                  placeholder="Thu tiền cọc đợt 1, thanh toán chuyển khoản Vietcombank..."
                  className="text-xs"
                />
              )}
            />
          </div>

          {/* Thẻ tóm tắt tính toán số dư công nợ sau khi thanh toán */}
          {amountNum > 0 && (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-3 text-xs space-y-1.5">
              <div className="flex items-center gap-1.5 font-bold text-emerald-800">
                <Calculator className="h-3.5 w-3.5" />
                <span>Quyết Toán Dư Nợ Sau Thu</span>
              </div>
              <div className="flex items-center justify-between pt-1 border-t border-emerald-200/60">
                <span className="text-slate-600">Dư nợ còn lại sau giao dịch:</span>
                <span className="font-mono font-extrabold text-sm text-emerald-700">
                  {formatVND(nextRemaining)}
                </span>
              </div>
            </div>
          )}

          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" onClick={handleClose}>
              Hủy
            </Button>
            <Button
              type="submit"
              variant="brand"
              isLoading={isSubmitting || createPaymentMutation.isPending}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              <CheckCircle2 className="mr-1.5 h-4 w-4" />
              Xác Nhận Nhập Quỹ Kế Toán
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
