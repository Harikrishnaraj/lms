'use client';

import * as React from 'react';
import * as LabelPrimitive from '@radix-ui/react-label';
import { AlertCircle, CheckCircle2 } from 'lucide-react';
import { cn } from '../lib/cn';

export const Label = React.forwardRef<
  React.ElementRef<typeof LabelPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof LabelPrimitive.Root> & { required?: boolean }
>(({ className, required, children, ...props }, ref) => (
  <LabelPrimitive.Root
    ref={ref}
    className={cn('text-label-md text-foreground', className)}
    {...props}
  >
    {children}
    {required && (
      <span className="ml-0.5 text-error-500" aria-hidden="true">
        *
      </span>
    )}
  </LabelPrimitive.Root>
));
Label.displayName = 'Label';

interface MessageProps extends React.HTMLAttributes<HTMLParagraphElement> {
  children: React.ReactNode;
}

export function FormHint({ className, children, ...props }: MessageProps) {
  return (
    <p className={cn('text-body-sm text-muted-foreground', className)} {...props}>
      {children}
    </p>
  );
}

export function FormError({ className, children, ...props }: MessageProps) {
  return (
    <p role="alert" className={cn('flex items-center gap-1 text-body-sm text-error-600', className)} {...props}>
      <AlertCircle className="size-3.5 shrink-0" aria-hidden="true" />
      {children}
    </p>
  );
}

export function FormSuccess({ className, children, ...props }: MessageProps) {
  return (
    <p className={cn('flex items-center gap-1 text-body-sm text-success-600', className)} {...props}>
      <CheckCircle2 className="size-3.5 shrink-0" aria-hidden="true" />
      {children}
    </p>
  );
}

export interface FormFieldProps {
  id: string;
  label: string;
  required?: boolean;
  hint?: React.ReactNode;
  error?: React.ReactNode;
  success?: React.ReactNode;
  children: React.ReactElement<{
    id?: string;
    'aria-invalid'?: boolean;
    'aria-describedby'?: string;
  }>;
  className?: string;
}

/**
 * Wires a Label, a single form control, and a hint/error/success message
 * together with the correct id/aria-describedby/aria-invalid associations —
 * this is the "Forms" primitive: one accessible field, control-agnostic.
 */
export function FormField({ id, label, required, hint, error, success, children, className }: FormFieldProps) {
  const describedBy = error ? `${id}-error` : success ? `${id}-success` : hint ? `${id}-hint` : undefined;

  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <Label htmlFor={id} required={required}>
        {label}
      </Label>
      {React.cloneElement(children, {
        id,
        'aria-invalid': error ? true : undefined,
        'aria-describedby': describedBy,
      })}
      {error ? (
        <FormError id={`${id}-error`}>{error}</FormError>
      ) : success ? (
        <FormSuccess id={`${id}-success`}>{success}</FormSuccess>
      ) : hint ? (
        <FormHint id={`${id}-hint`}>{hint}</FormHint>
      ) : null}
    </div>
  );
}
