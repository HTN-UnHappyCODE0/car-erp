import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/shared/lib/utils';
import { Loader2 } from 'lucide-react';

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ff682c] focus-visible:ring-offset-1 disabled:pointer-events-none disabled:opacity-50 active:scale-[0.98] select-none',
  {
    variants: {
      variant: {
        default:
          'bg-[#202020] text-white shadow-sm hover:bg-[#333333] hover:shadow',
        brand:
          'bg-[#202020] text-white shadow-sm hover:bg-[#333333] border border-[#333333]',
        ember:
          'bg-[#ff682c] text-white shadow-sm hover:bg-[#e5561e] hover:shadow-md',
        destructive:
          'bg-rose-600 text-white shadow-sm hover:bg-rose-700',
        outline:
          'border border-[#e8e8e8] bg-white text-[#202020] hover:bg-[#efefef] hover:border-[#828282]/30',
        secondary:
          'bg-[#efefef] text-[#202020] hover:bg-[#e8e8e8]',
        ghost:
          'hover:bg-[#efefef] text-[#202020]',
        link: 'text-[#ff682c] underline-offset-4 hover:underline font-medium',
        success:
          'bg-emerald-700 text-white shadow-sm hover:bg-emerald-800',
        ivory:
          'bg-[#ebe6dd] text-[#202020] hover:bg-[#dfd9ce] border border-[#d8d1c4]',
      },
      size: {
        default: 'h-9 px-4 py-2',
        sm: 'h-8 rounded-lg px-3 text-xs',
        lg: 'h-11 rounded-xl px-6 text-base',
        pill: 'h-9 rounded-full px-5 py-2',
        icon: 'h-9 w-9 p-0 rounded-lg',
        'icon-pill': 'h-9 w-9 p-0 rounded-full',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  isLoading?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, isLoading = false, children, disabled, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button';
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        disabled={disabled || isLoading}
        {...props}
      >
        {isLoading && <Loader2 className="h-4 w-4 animate-spin text-current" />}
        {children}
      </Comp>
    );
  }
);
Button.displayName = 'Button';

export { Button, buttonVariants };
