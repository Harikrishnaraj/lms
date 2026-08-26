import * as React from 'react';
import { cn } from '../lib/cn';

/** Level 1 elevation: white surface, 1px border, 12px radius, no shadow at rest. */
export const Card = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn('rounded-lg border border-border bg-surface text-foreground', className)}
      {...props}
    />
  ),
);
Card.displayName = 'Card';

/** Optional hover elevation (Level 2) for interactive/clickable cards. */
export const InteractiveCard = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        'rounded-lg border border-border bg-surface text-foreground transition-shadow duration-150',
        'hover:shadow-level2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
        className,
      )}
      tabIndex={0}
      {...props}
    />
  ),
);
InteractiveCard.displayName = 'InteractiveCard';

export const CardHeader = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn('flex flex-col gap-1.5 p-6', className)} {...props} />
  ),
);
CardHeader.displayName = 'CardHeader';

export const CardTitle = React.forwardRef<HTMLHeadingElement, React.HTMLAttributes<HTMLHeadingElement>>(
  ({ className, ...props }, ref) => (
    <h3 ref={ref} className={cn('text-h4 text-foreground', className)} {...props} />
  ),
);
CardTitle.displayName = 'CardTitle';

export const CardDescription = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLParagraphElement>>(
  ({ className, ...props }, ref) => (
    <p ref={ref} className={cn('text-body-sm text-muted-foreground', className)} {...props} />
  ),
);
CardDescription.displayName = 'CardDescription';

export const CardContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => <div ref={ref} className={cn('p-6 pt-0', className)} {...props} />,
);
CardContent.displayName = 'CardContent';

export const CardFooter = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn('flex items-center gap-3 p-6 pt-0', className)} {...props} />
  ),
);
CardFooter.displayName = 'CardFooter';

/**
 * Course card: top-aligned image, 12px radius, Level 1 elevation, progress
 * bar pinned to the bottom — per spec ("Cards" component section).
 */
export interface CourseCardProps extends React.HTMLAttributes<HTMLDivElement> {
  imageUrl?: string;
  imageAlt?: string;
  title: string;
  subtitle?: string;
  footer?: React.ReactNode;
}

export const CourseCard = React.forwardRef<HTMLDivElement, CourseCardProps>(
  ({ className, imageUrl, imageAlt = '', title, subtitle, footer, children, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        'flex flex-col overflow-hidden rounded-lg border border-border bg-surface transition-shadow duration-150 hover:shadow-level2',
        className,
      )}
      {...props}
    >
      {imageUrl ? (
        // A plain <img> is intentional: this package is framework-agnostic
        // and must not depend on next/image.
        <img src={imageUrl} alt={imageAlt} className="h-36 w-full object-cover" />
      ) : (
        <div className="h-36 w-full bg-navy-50" aria-hidden="true" />
      )}
      <div className="flex flex-1 flex-col gap-1 p-4">
        <h3 className="text-h4 text-foreground">{title}</h3>
        {subtitle && <p className="text-body-sm text-muted-foreground">{subtitle}</p>}
        {children}
      </div>
      {footer && <div className="p-4 pt-0">{footer}</div>}
    </div>
  ),
);
CourseCard.displayName = 'CourseCard';
