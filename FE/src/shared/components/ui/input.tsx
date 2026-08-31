import * as React from 'react';
import { cn } from '@/shared/lib/utils';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  icon?: React.ReactNode;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, icon, ...props }, ref) => {
    return (
      <div className="relative flex w-full items-center">
        {icon && (
          <div className="pointer-events-none absolute left-3 flex items-center justify-center text-[#828282]">
            {icon}
          </div>
        )}
        <input
          type={type}
          className={cn(
            'flex h-10 w-full rounded-xl border border-[#e8e8e8] bg-white px-3.5 py-2 text-sm text-[#202020] shadow-[0_1px_2px_rgba(32,32,32,0.02)] transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-[#828282] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ff682c] focus-visible:border-transparent disabled:cursor-not-allowed disabled:opacity-50',
            icon && 'pl-10',
            className
          )}
          ref={ref}
          {...props}
        />
      </div>
    );
  }
);
Input.displayName = 'Input';

export { Input };
