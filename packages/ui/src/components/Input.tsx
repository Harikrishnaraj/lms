import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../lib/cn';

/**
 * Text field: white background, 1px Gray-300 border. On focus, border
 * changes to Primary Navy with a 2px soft outer glow. Error states pair a
 * red border with an icon at the call site (see FormField).
 */
const inputVariants = cva(
  [
    'flex w-full rounded-md border bg-surface px-3 text-body-sm text-foreground',
    'placeholder:text-muted-foreground',
    'transition-colors duration-150',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-0',
    'disabled:cursor-not-allowed disabled:bg-gray-50 disabled:text-muted-foreground',
  ].join(' '),
  {
    variants: {
      state: {
        default: 'border-gray-300 focus-visible:border-primary focus-visible:ring-primary/20',
        error: 'border-error-500 focus-visible:border-error-500 focus-visible:ring-error-500/20',
        success: 'border-success-500 focus-visible:border-success-500 focus-visible:ring-success-500/20',
      },
      size: {
        sm: 'h-8',
        md: 'h-10',
        lg: 'h-12 text-body-md',
      },
    },
    defaultVariants: {
      state: 'default',
      size: 'md',
    },
  },
);

export interface InputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'>,
    VariantProps<typeof inputVariants> {
  /** Icon rendered inside the field, left-aligned. */
  startIcon?: React.ReactNode;
  /** Icon or control rendered inside the field, right-aligned. */
  endIcon?: React.ReactNode;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, state, size, startIcon, endIcon, ...props }, ref) => {
    if (!startIcon && !endIcon) {
      return <input ref={ref} className={cn(inputVariants({ state, size }), className)} {...props} />;
    }

    return (
      <div className="relative flex w-full items-center">
        {startIcon && (
          <span className="pointer-events-none absolute left-3 flex items-center text-muted-foreground">
            {startIcon}
          </span>
        )}
        <input
          ref={ref}
          className={cn(
            inputVariants({ state, size }),
            startIcon && 'pl-9',
            endIcon && 'pr-9',
            className,
          )}
          {...props}
        />
        {endIcon && <span className="absolute right-3 flex items-center">{endIcon}</span>}
      </div>
    );
  },
);
Input.displayName = 'Input';
