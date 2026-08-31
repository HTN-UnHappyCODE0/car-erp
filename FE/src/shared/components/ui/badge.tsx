import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/shared/lib/utils';

const badgeVariants = cva(
  'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors select-none',
  {
    variants: {
      variant: {
        default:
          'border border-[#e8e8e8] bg-[#efefef] text-[#202020]',
        secondary:
          'border border-[#e8e8e8] bg-[#f5f5f5] text-[#4d4d4d]',
        ember:
          'border border-[#ff682c]/20 bg-[#ff682c]/10 text-[#ff682c] font-semibold',
        brass:
          'border border-[#816729]/20 bg-[#816729]/10 text-[#816729] font-semibold',
        ivory:
          'border border-[#ded7cb] bg-[#ebe6dd] text-[#202020]',
        graphite:
          'border border-[#202020] bg-[#202020] text-white',
        success:
          'border border-emerald-200 bg-emerald-50 text-emerald-800',
        warning:
          'border border-amber-200 bg-amber-50 text-amber-800',
        destructive:
          'border border-rose-200 bg-rose-50 text-rose-800',
        outline:
          'border border-[#e8e8e8] text-[#4d4d4d] bg-transparent',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {
  dot?: boolean;
}

function Badge({ className, variant, dot = false, children, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props}>
      {dot && (
        <span
          className={cn(
            'h-1.5 w-1.5 rounded-full shrink-0',
            variant === 'success' && 'bg-emerald-600 animate-pulse',
            variant === 'warning' && 'bg-amber-600',
            variant === 'destructive' && 'bg-rose-600',
            variant === 'ember' && 'bg-[#ff682c] animate-pulse',
            variant === 'brass' && 'bg-[#816729]',
            variant === 'graphite' && 'bg-white',
            variant === 'default' && 'bg-[#202020]',
            variant === 'secondary' && 'bg-[#828282]',
            variant === 'outline' && 'bg-[#828282]'
          )}
        />
      )}
      {children}
    </div>
  );
}

export { Badge, badgeVariants };
