'use client';

import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { Loader2 } from 'lucide-react';
import { cn } from '../lib/cn';

/**
 * Primary: solid Deep Navy, white text, 8px radius.
 * Secondary: transparent, 1px Deep Navy border, Navy text.
 * Ghost: no border/background, Navy text — for secondary actions in tables.
 */
export const buttonVariants = cva(
  [
    'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-body-sm font-medium',
    'transition-colors duration-150',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2',
    'disabled:pointer-events-none disabled:opacity-50',
  ].join(' '),
  {
    variants: {
      variant: {
        primary: 'bg-primary text-on-primary hover:bg-primary-hover active:bg-primary-active shadow-sm',
        secondary:
          'border border-primary text-primary bg-transparent hover:bg-navy-50 active:bg-navy-100',
        ghost: 'text-primary bg-transparent hover:bg-navy-50 active:bg-navy-100',
        destructive: 'bg-error-500 text-white hover:bg-error-600 active:bg-error-700 shadow-sm',
      },
      size: {
        sm: 'h-8 px-3 text-label-sm',
        md: 'h-10 px-4',
        lg: 'h-12 px-6 text-body-md',
        icon: 'h-10 w-10 shrink-0 p-0',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'md',
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  /** Render as the child element (e.g. a Next.js Link) instead of a <button>. */
  asChild?: boolean;
  /** Shows a spinner and disables interaction. */
  loading?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, loading = false, disabled, children, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button';

    return (
      <Comp
        ref={ref}
        className={cn(buttonVariants({ variant, size }), className)}
        disabled={disabled || loading}
        aria-busy={loading || undefined}
        {...props}
      >
        {loading && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
        {children}
      </Comp>
    );
  },
);
Button.displayName = 'Button';
