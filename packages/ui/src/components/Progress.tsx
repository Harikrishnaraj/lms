'use client';

import * as React from 'react';
import * as ProgressPrimitive from '@radix-ui/react-progress';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../lib/cn';

/**
 * 8px height, fully rounded ends. Success Green for completions, Primary
 * Navy for in-progress states — per spec ("Progress Indicators").
 */
const indicatorVariants = cva('h-full w-full flex-1 rounded-full transition-transform duration-300', {
  variants: {
    variant: {
      progress: 'bg-primary',
      complete: 'bg-success-500',
    },
  },
  defaultVariants: {
    variant: 'progress',
  },
});

export interface ProgressBarProps
  extends React.ComponentPropsWithoutRef<typeof ProgressPrimitive.Root>,
    VariantProps<typeof indicatorVariants> {
  value: number;
  label?: string;
  showValue?: boolean;
}

export const ProgressBar = React.forwardRef<React.ElementRef<typeof ProgressPrimitive.Root>, ProgressBarProps>(
  ({ className, value, variant, label, showValue, ...props }, ref) => {
    const resolvedVariant = variant ?? (value >= 100 ? 'complete' : 'progress');
    return (
      <div className="flex w-full flex-col gap-1.5">
        {(label || showValue) && (
          <div className="flex items-center justify-between text-body-sm text-muted-foreground">
            {label && <span>{label}</span>}
            {showValue && <span className="text-label-sm text-foreground">{Math.round(value)}%</span>}
          </div>
        )}
        <ProgressPrimitive.Root
          ref={ref}
          value={value}
          className={cn('h-2 w-full overflow-hidden rounded-full bg-gray-200', className)}
          {...props}
        >
          <ProgressPrimitive.Indicator
            className={indicatorVariants({ variant: resolvedVariant })}
            style={{ transform: `translateX(-${100 - Math.min(Math.max(value, 0), 100)}%)` }}
          />
        </ProgressPrimitive.Root>
      </div>
    );
  },
);
ProgressBar.displayName = 'ProgressBar';
