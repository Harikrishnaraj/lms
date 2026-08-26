import * as React from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '../lib/cn';

export interface SpinnerProps extends React.HTMLAttributes<HTMLSpanElement> {
  size?: 'sm' | 'md' | 'lg';
  /** Accessible label announced to screen readers. Defaults to "Loading". */
  label?: string;
}

const SIZES = {
  sm: 'size-4',
  md: 'size-6',
  lg: 'size-8',
} as const;

export function Spinner({ size = 'md', label = 'Loading', className, ...props }: SpinnerProps) {
  return (
    <span role="status" className={cn('inline-flex text-primary', className)} {...props}>
      <Loader2 className={cn('animate-spin', SIZES[size])} aria-hidden="true" />
      <span className="sr-only">{label}</span>
    </span>
  );
}

export interface FullPageLoaderProps {
  label?: string;
}

/** A centered, page/panel-filling loading state — for the whole content area, not just one control. */
export function FullPageLoader({ label = 'Loading' }: FullPageLoaderProps) {
  return (
    <div className="flex min-h-[16rem] w-full flex-col items-center justify-center gap-3 text-muted-foreground">
      <Spinner size="lg" label={label} />
      <p className="text-body-sm">{label}…</p>
    </div>
  );
}
