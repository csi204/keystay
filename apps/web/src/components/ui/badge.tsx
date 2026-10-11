import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const badgeVariants = cva(
  'inline-flex items-center rounded-md border px-2 py-0.5 text-[11px] font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
  {
    variants: {
      variant: {
        default: 'border-transparent bg-primary text-primary-foreground shadow-sm',
        secondary: 'border-transparent bg-secondary text-secondary-foreground',
        destructive: 'border-transparent bg-destructive text-destructive-foreground',
        outline: 'text-foreground',
        // Keystay Room Statuses (Soft Tint Minimalist)
        available: 'bg-green-50 text-green-800 border-green-200',
        reserved: 'bg-blue-50 text-blue-800 border-blue-200',
        occupied: 'bg-emerald-50 text-emerald-800 border-emerald-200',
        checkedOut: 'bg-slate-50 text-slate-700 border-slate-300',
        cleaning: 'bg-amber-50 text-amber-800 border-amber-200',
        maintenance: 'bg-red-50 text-red-800 border-red-200',
        outOfOrder: 'bg-slate-100 text-slate-600 border-slate-300',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
