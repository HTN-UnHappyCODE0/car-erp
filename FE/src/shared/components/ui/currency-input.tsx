'use client';

import React, { forwardRef, useState, useEffect } from 'react';
import { Input } from './input';
import { cn } from '@/shared/lib/utils';

export interface CurrencyInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'value'> {
  value?: string | number;
  onValueChange?: (rawValue: string) => void;
  suffix?: string;
}

// Hàm format chuỗi số có dấu phẩy hàng nghìn
const formatCurrencyDisplay = (val: string | number | undefined): string => {
  if (val === undefined || val === null || val === '') return '';
  const cleanNumber = String(val).replace(/[^0-9]/g, '');
  if (!cleanNumber) return '';
  return new Intl.NumberFormat('vi-VN').format(Number(cleanNumber));
};

export const CurrencyInput = forwardRef<HTMLInputElement, CurrencyInputProps>(
  ({ value, onValueChange, className, suffix = '₫', placeholder = '0', disabled, ...props }, ref) => {
    const [displayVal, setDisplayVal] = useState<string>(() => formatCurrencyDisplay(value));

    useEffect(() => {
      setDisplayVal(formatCurrencyDisplay(value));
    }, [value]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const rawVal = e.target.value.replace(/[^0-9]/g, '');
      const formatted = formatCurrencyDisplay(rawVal);
      setDisplayVal(formatted);
      if (onValueChange) {
        onValueChange(rawVal);
      }
    };

    return (
      <div className="relative flex items-center">
        <Input
          ref={ref}
          type="text"
          inputMode="numeric"
          value={displayVal}
          onChange={handleChange}
          placeholder={placeholder}
          disabled={disabled}
          className={cn('pr-8 font-mono', className)}
          {...props}
        />
        {suffix && (
          <span className="pointer-events-none absolute right-3 text-xs font-semibold text-slate-400">
            {suffix}
          </span>
        )}
      </div>
    );
  }
);

CurrencyInput.displayName = 'CurrencyInput';
