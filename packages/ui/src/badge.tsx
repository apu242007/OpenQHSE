import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from './lib/utils';

const badgeVariants = cva(
  'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
  {
    variants: {
      variant: {
        default: 'bg-primary/10 text-primary border border-primary/20',
        secondary: 'bg-surface-alt text-muted border border-border',
        destructive: 'bg-danger/10 text-danger border border-danger/20',
        safe: 'bg-safe/10 text-safe border border-safe/20',
        warning: 'bg-warning/10 text-warning border border-warning/20',
        outline: 'text-foreground border border-border',
        critical: 'bg-red-500/10 text-red-500 border border-red-500/20',
        high: 'bg-orange-500/10 text-orange-500 border border-orange-500/20',
        medium: 'bg-yellow-500/10 text-yellow-600 border border-yellow-500/20',
        low: 'bg-blue-500/10 text-blue-500 border border-blue-500/20',
        observation: 'bg-gray-500/10 text-gray-500 border border-gray-500/20',
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
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
