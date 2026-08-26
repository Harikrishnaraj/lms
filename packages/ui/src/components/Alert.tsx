import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { AlertCircle, AlertTriangle, CheckCircle2, Info } from 'lucide-react';
import { cn } from '../lib/cn';

const alertVariants = cva('flex gap-3 rounded-lg border p-4 text-body-sm', {
  variants: {
    variant: {
      info: 'border-navy-200 bg-navy-50 text-navy-800',
      success: 'border-success-500/30 bg-success-50 text-success-700',
      warning: 'border-warning-500/30 bg-warning-50 text-warning-700',
      error: 'border-error-500/30 bg-error-50 text-error-700',
    },
  },
  defaultVariants: {
    variant: 'info',
  },
});

const ICONS = {
  info: Info,
  success: CheckCircle2,
  warning: AlertTriangle,
  error: AlertCircle,
} as const;

export interface AlertProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, 'title'>,
    VariantProps<typeof alertVariants> {
  title?: React.ReactNode;
  /** Override the default variant icon, or pass `false` to hide it. */
  icon?: React.ReactNode | false;
}

export function Alert({ className, variant = 'info', title, icon, children, ...props }: AlertProps) {
  const Icon = ICONS[variant ?? 'info'];
  return (
    <div role="alert" className={cn(alertVariants({ variant }), className)} {...props}>
      {icon !== false && <span className="shrink-0">{icon ?? <Icon className="size-5" aria-hidden="true" />}</span>}
      <div className="flex flex-col gap-1">
        {title && <p className="text-label-md">{title}</p>}
        {children && <div className="text-body-sm">{children}</div>}
      </div>
    </div>
  );
}
