'use client';

import React from 'react';
import { formatVND, cn } from '@/shared/lib/utils';
import { CheckCircle2, AlertCircle, Clock } from 'lucide-react';

interface PaymentProgressBarProps {
  totalAmount: string | number;
  paidAmount: string | number;
  className?: string;
  isCompact?: boolean;
}

export function PaymentProgressBar({
  totalAmount,
  paidAmount,
  className,
  isCompact = false,
}: PaymentProgressBarProps) {
  const total = typeof totalAmount === 'string' ? parseFloat(totalAmount) || 0 : totalAmount;
  const paid = typeof paidAmount === 'string' ? parseFloat(paidAmount) || 0 : paidAmount;
  const remaining = Math.max(0, total - paid);

  const percentage = total > 0 ? Math.min(100, Math.max(0, Math.round((paid / total) * 100))) : 0;
  const isCompleted = percentage >= 100;
  const isPartial = percentage > 0 && percentage < 100;

  if (isCompact) {
    return (
      <div className={cn('space-y-1.5 min-w-[140px]', className)}>
        <div className="flex items-center justify-between text-[11px]">
          <span className="font-semibold text-slate-700">
            {formatVND(paid)}
          </span>
          <span
            className={cn(
              'font-mono font-bold text-[10px]',
              isCompleted
                ? 'text-emerald-600'
                : isPartial
                ? 'text-blue-600'
                : 'text-slate-400'
            )}
          >
            {percentage}%
          </span>
        </div>
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
          <div
            className={cn(
              'h-full rounded-full transition-all duration-500',
              isCompleted
                ? 'bg-emerald-500'
                : isPartial
                ? 'bg-blue-600'
                : 'bg-slate-300'
            )}
            style={{ width: `${percentage}%` }}
          />
        </div>
        {remaining > 0 && (
          <div className="text-[10px] text-slate-400">
            Còn nợ: <span className="font-medium text-slate-600">{formatVND(remaining)}</span>
          </div>
        )}
      </div>
    );
  }

  return (
    <div
      className={cn(
        'rounded-2xl border p-4 transition-all',
        isCompleted
          ? 'border-emerald-200/80 bg-emerald-50/40'
          : isPartial
          ? 'border-blue-200/80 bg-blue-50/40'
          : 'border-slate-200 bg-slate-50/50',
        className
      )}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {isCompleted ? (
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700">
              <CheckCircle2 className="h-4 w-4" />
            </div>
          ) : isPartial ? (
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-100 text-blue-700">
              <Clock className="h-4 w-4" />
            </div>
          ) : (
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-200 text-slate-700">
              <AlertCircle className="h-4 w-4" />
            </div>
          )}
          <div>
            <h5 className="text-xs font-bold text-slate-900">
              Tiến Độ Thu Tiền Thực Tế
            </h5>
            <p className="text-[11px] text-slate-500">
              {isCompleted
                ? 'Đã thu đủ 100% giá trị hóa đơn'
                : isPartial
                ? `Đã thu ${percentage}% - Còn thiếu ${formatVND(remaining)}`
                : 'Chưa phát sinh giao dịch thu tiền'}
            </p>
          </div>
        </div>
        <div className="text-right">
          <span
            className={cn(
              'text-lg font-black font-mono',
              isCompleted
                ? 'text-emerald-600'
                : isPartial
                ? 'text-blue-600'
                : 'text-slate-400'
            )}
          >
            {percentage}%
          </span>
        </div>
      </div>

      {/* Main Progress Bar */}
      <div className="mt-3.5 h-2.5 w-full overflow-hidden rounded-full bg-slate-200/80">
        <div
          className={cn(
            'h-full rounded-full transition-all duration-700 ease-out shadow-sm',
            isCompleted
              ? 'bg-emerald-500 shadow-emerald-500/30'
              : isPartial
              ? 'bg-blue-600 shadow-blue-500/30'
              : 'bg-slate-300'
          )}
          style={{ width: `${percentage}%` }}
        />
      </div>

      {/* Breakdown Details */}
      <div className="mt-3 grid grid-cols-3 gap-2 border-t border-slate-200/60 pt-3 text-xs">
        <div>
          <span className="text-[10px] text-slate-500 block">Tổng Hóa Đơn:</span>
          <span className="font-bold text-slate-900">{formatVND(total)}</span>
        </div>
        <div>
          <span className="text-[10px] text-emerald-600 block font-medium">Đã Thu:</span>
          <span className="font-bold text-emerald-600">{formatVND(paid)}</span>
        </div>
        <div>
          <span className="text-[10px] text-rose-600 block font-medium">Còn Nợ:</span>
          <span className="font-extrabold text-rose-600">{formatVND(remaining)}</span>
        </div>
      </div>
    </div>
  );
}
