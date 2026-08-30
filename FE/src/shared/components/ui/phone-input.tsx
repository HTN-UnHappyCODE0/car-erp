'use client';

import React, { forwardRef, useState, useEffect } from 'react';
import { Input } from './input';
import { cn } from '@/shared/lib/utils';
import { Phone } from 'lucide-react';

export interface PhoneInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'value'> {
  value?: string;
  onValueChange?: (rawValue: string) => void;
}

// Hàm format số điện thoại VN dạng: 098 123 4567
const formatPhoneDisplay = (val: string | undefined): string => {
  if (!val) return '';
  const digits = val.replace(/\D/g, '').slice(0, 11);
  if (digits.length <= 4) return digits;
  if (digits.length <= 7) return `${digits.slice(0, 4)} ${digits.slice(4)}`;
  return `${digits.slice(0, 4)} ${digits.slice(4, 7)} ${digits.slice(7)}`;
};

export const PhoneInput = forwardRef<HTMLInputElement, PhoneInputProps>(
  ({ value, onValueChange, className, placeholder = '098 123 4567', disabled, ...props }, ref) => {
    const [displayVal, setDisplayVal] = useState<string>(() => formatPhoneDisplay(value));

    useEffect(() => {
      setDisplayVal(formatPhoneDisplay(value));
    }, [value]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const rawVal = e.target.value.replace(/\D/g, '').slice(0, 11);
      const formatted = formatPhoneDisplay(rawVal);
      setDisplayVal(formatted);
      if (onValueChange) {
        onValueChange(rawVal);
      }
    };

    return (
      <div className="relative flex items-center">
        <Input
          ref={ref}
          type="tel"
          inputMode="tel"
          value={displayVal}
          onChange={handleChange}
          placeholder={placeholder}
          disabled={disabled}
          icon={<Phone className="h-4 w-4 text-slate-400" />}
          className={cn('font-mono', className)}
          {...props}
        />
      </div>
    );
  }
);

PhoneInput.displayName = 'PhoneInput';
