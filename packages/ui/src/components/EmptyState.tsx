import * as React from 'react';
import { Inbox } from 'lucide-react';
import { cn } from '../lib/cn';

export interface EmptyStateProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'title'> {
  icon?: React.ReactNode;
  title: React.ReactNode;
  description?: React.ReactNode;
  action?: React.ReactNode;
}

export function EmptyState({ icon, title, description, action, className, ...props }: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-border p-12 text-center',
        className,
      )}
      {...props}
    >
      <span className="flex size-12 items-center justify-center rounded-full bg-navy-50 text-navy-600">
        {icon ?? <Inbox className="size-6" aria-hidden="true" />}
      </span>
      <div className="flex flex-col gap-1">
        <p className="text-h4 text-foreground">{title}</p>
        {description && <p className="max-w-sm text-body-sm text-muted-foreground">{description}</p>}
      </div>
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}
