'use client';

import React from 'react';
import { OrderStatus, DepositResolution } from '@/entities/sales-order';
import { CheckCircle2, Circle, AlertOctagon } from 'lucide-react';
import { cn } from '@/shared/lib/utils';

interface OrderStepperProps {
  status: OrderStatus;
  depositResolution?: DepositResolution | null;
  className?: string;
  isCompact?: boolean;
}

const STEPS = [
  { id: 'DRAFT', label: 'Tạo Đơn Nháp', stepNumber: 1 },
  { id: 'DEPOSIT_PAID', label: 'Đã Nhận Cọc', stepNumber: 2 },
  { id: 'FULL_PAID', label: 'Thanh Toán 100%', stepNumber: 3 },
  { id: 'DELIVERED', label: 'Đã Bàn Giao Xe', stepNumber: 4 },
];

const getStepIndex = (status: OrderStatus): number => {
  switch (status) {
    case 'DRAFT':
      return 0;
    case 'DEPOSIT_PAID':
      return 1;
    case 'FULL_PAID':
      return 2;
    case 'DELIVERED':
      return 3;
    case 'CANCELLED':
      return -1;
    default:
      return 0;
  }
};

export function OrderStepper({
  status,
  depositResolution,
  className,
  isCompact = false,
}: OrderStepperProps) {
  const currentStepIdx = getStepIndex(status);

  // Trường hợp đơn bị hủy (CANCELLED)
  if (status === 'CANCELLED') {
    return (
      <div
        className={cn(
          'flex items-center gap-2 rounded-full border border-rose-200 bg-rose-50 px-3 py-1 text-xs text-rose-700 font-semibold',
          className
        )}
      >
        <AlertOctagon className="h-3.5 w-3.5 shrink-0 text-rose-600" />
        <span>Đơn Hàng Đã Hủy</span>
        {depositResolution && depositResolution !== 'NONE' && (
          <span className="rounded-full bg-rose-200/80 px-2 py-0.5 text-[10px] font-mono">
            Xử lý cọc: {depositResolution}
          </span>
        )}
      </div>
    );
  }

  // Chế độ Compact (Hiển thị trong DataTable)
  if (isCompact) {
    return (
      <div className={cn('flex items-center gap-1.5', className)}>
        {STEPS.map((step, idx) => {
          const isCompleted = idx < currentStepIdx;
          const isCurrent = idx === currentStepIdx;

          return (
            <React.Fragment key={step.id}>
              <div
                className={cn(
                  'flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold transition-all',
                  isCompleted
                    ? 'bg-emerald-600 text-white'
                    : isCurrent
                    ? 'bg-[#202020] text-white ring-2 ring-[#ff682c]'
                    : 'bg-[#efefef] text-[#828282]'
                )}
                title={`${step.label} (${isCompleted ? 'Đã xong' : isCurrent ? 'Hiện tại' : 'Chưa đến'})`}
              >
                {isCompleted ? <CheckCircle2 className="h-3.5 w-3.5" /> : step.stepNumber}
              </div>
              {idx < STEPS.length - 1 && (
                <div
                  className={cn(
                    'h-0.5 w-3 rounded-full',
                    idx < currentStepIdx
                      ? 'bg-emerald-600'
                      : 'bg-[#e8e8e8]'
                  )}
                />
              )}
            </React.Fragment>
          );
        })}
      </div>
    );
  }

  // Chế độ Full Stepper (Hiển thị chi tiết)
  return (
    <div className={cn('w-full py-2', className)}>
      <div className="flex items-center justify-between">
        {STEPS.map((step, idx) => {
          const isCompleted = idx < currentStepIdx;
          const isCurrent = idx === currentStepIdx;

          return (
            <React.Fragment key={step.id}>
              <div className="flex flex-col items-center text-center">
                <div
                  className={cn(
                    'flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold transition-all',
                    isCompleted
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : isCurrent
                      ? 'bg-[#202020] text-white ring-3 ring-[#ff682c]/30 shadow-xs'
                      : 'bg-[#efefef] text-[#828282] border border-[#e8e8e8]'
                  )}
                >
                  {isCompleted ? <CheckCircle2 className="h-4 w-4" /> : isCurrent ? step.stepNumber : <Circle className="h-3.5 w-3.5" />}
                </div>
                <span
                  className={cn(
                    'mt-1.5 text-xs font-medium',
                    isCompleted
                      ? 'text-emerald-700 font-semibold'
                      : isCurrent
                      ? 'text-[#202020] font-bold'
                      : 'text-[#828282]'
                  )}
                >
                  {step.label}
                </span>
              </div>
              {idx < STEPS.length - 1 && (
                <div
                  className={cn(
                    'h-1 flex-1 mx-2 rounded-full transition-all',
                    idx < currentStepIdx
                      ? 'bg-emerald-600'
                      : 'bg-[#e8e8e8]'
                  )}
                />
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
}
