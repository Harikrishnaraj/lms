'use client';

import * as React from 'react';
import * as ToastPrimitive from '@radix-ui/react-toast';
import { cva, type VariantProps } from 'class-variance-authority';
import { AlertCircle, AlertTriangle, CheckCircle2, Info, X } from 'lucide-react';
import { cn } from '../lib/cn';

export const ToastProvider = ToastPrimitive.Provider;

export const ToastViewport = React.forwardRef<
  React.ElementRef<typeof ToastPrimitive.Viewport>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitive.Viewport>
>(({ className, ...props }, ref) => (
  <ToastPrimitive.Viewport
    ref={ref}
    className={cn(
      'fixed bottom-0 right-0 z-[100] flex w-full max-w-sm flex-col gap-2 p-4 outline-none',
      className,
    )}
    {...props}
  />
));
ToastViewport.displayName = 'ToastViewport';

const toastVariants = cva(
  'pointer-events-auto relative flex w-full items-start gap-3 rounded-lg border p-4 shadow-level2',
  {
    variants: {
      variant: {
        info: 'border-navy-200 bg-surface text-foreground',
        success: 'border-success-500/30 bg-surface text-foreground',
        warning: 'border-warning-500/30 bg-surface text-foreground',
        error: 'border-error-500/30 bg-surface text-foreground',
      },
    },
    defaultVariants: {
      variant: 'info',
    },
  },
);

const ICONS = {
  info: <Info className="size-5 shrink-0 text-navy-600" aria-hidden="true" />,
  success: <CheckCircle2 className="size-5 shrink-0 text-success-500" aria-hidden="true" />,
  warning: <AlertTriangle className="size-5 shrink-0 text-warning-500" aria-hidden="true" />,
  error: <AlertCircle className="size-5 shrink-0 text-error-500" aria-hidden="true" />,
} as const;

export interface ToastRootProps
  extends Omit<React.ComponentPropsWithoutRef<typeof ToastPrimitive.Root>, 'title'>,
    VariantProps<typeof toastVariants> {
  title: React.ReactNode;
  description?: React.ReactNode;
}

export const Toast = React.forwardRef<React.ElementRef<typeof ToastPrimitive.Root>, ToastRootProps>(
  ({ className, variant = 'info', title, description, ...props }, ref) => (
    <ToastPrimitive.Root ref={ref} className={cn(toastVariants({ variant }), className)} {...props}>
      {ICONS[variant ?? 'info']}
      <div className="flex flex-1 flex-col gap-0.5">
        <ToastPrimitive.Title className="text-label-md text-foreground">{title}</ToastPrimitive.Title>
        {description && (
          <ToastPrimitive.Description className="text-body-sm text-muted-foreground">
            {description}
          </ToastPrimitive.Description>
        )}
      </div>
      <ToastPrimitive.Close
        aria-label="Dismiss"
        className="shrink-0 rounded-sm text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
      >
        <X className="size-4" />
      </ToastPrimitive.Close>
    </ToastPrimitive.Root>
  ),
);
Toast.displayName = 'Toast';

export const ToastAction = ToastPrimitive.Action;
