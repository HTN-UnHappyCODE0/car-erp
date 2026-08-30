import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/shared/lib/utils';

const badgeVariants = cva(
  'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
  {
    variants: {
      variant: {
        default:
          'border-transparent bg-blue-100 text-blue-800',
        secondary:
          'border-transparent bg-slate-100 text-slate-900',
        success:
          'border-transparent bg-emerald-100 text-emerald-800',
        warning:
          'border-transparent bg-amber-100 text-amber-800',
        destructive:
          'border-transparent bg-rose-100 text-rose-800',
        outline:
          'text-slate-950 border border-slate-200',
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
            'h-1.5 w-1.5 rounded-full',
            variant === 'success' && 'bg-emerald-500 animate-pulse',
            variant === 'warning' && 'bg-amber-500',
            variant === 'destructive' && 'bg-rose-500',
            variant === 'default' && 'bg-blue-500',
            variant === 'secondary' && 'bg-slate-500',
            variant === 'outline' && 'bg-slate-400'
          )}
        />
      )}
      {children}
    </div>
  );
}

export { Badge, badgeVariants };
