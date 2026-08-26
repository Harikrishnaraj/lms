import * as React from 'react';
import { AlertTriangle } from 'lucide-react';
import { cn } from '../lib/cn';
import { Button } from './Button';

export interface ErrorStateProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'title'> {
  title?: React.ReactNode;
  description?: React.ReactNode;
  onRetry?: () => void;
  retryLabel?: string;
}

/**
 * A full panel/page-level failure state — distinct from a field-level
 * FormError or a transient Alert/Toast. Used when an entire view can't load.
 */
export function ErrorState({
  title = 'Something went wrong',
  description = 'Please try again. If the problem continues, contact support.',
  onRetry,
  retryLabel = 'Try again',
  className,
  ...props
}: ErrorStateProps) {
  return (
    <div
      role="alert"
      className={cn(
        'flex flex-col items-center justify-center gap-3 rounded-lg border border-border p-12 text-center',
        className,
      )}
      {...props}
    >
      <span className="flex size-12 items-center justify-center rounded-full bg-error-50 text-error-600">
        <AlertTriangle className="size-6" aria-hidden="true" />
      </span>
      <div className="flex flex-col gap-1">
        <p className="text-h4 text-foreground">{title}</p>
        {description && <p className="max-w-sm text-body-sm text-muted-foreground">{description}</p>}
      </div>
      {onRetry && (
        <Button variant="secondary" onClick={onRetry} className="mt-2">
          {retryLabel}
        </Button>
      )}
    </div>
  );
}
