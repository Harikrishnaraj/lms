import * as React from 'react';
import { cn } from '../lib/cn';

/** A pulsing placeholder block for content that is still loading. */
export function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      role="presentation"
      aria-hidden="true"
      className={cn('animate-pulse rounded-md bg-gray-200', className)}
      {...props}
    />
  );
}
