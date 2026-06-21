import * as React from 'react';
import { cn } from '../lib/cn';
import { Label } from './label';
import { ValidationMessage } from './validation-message';

export const Form = React.forwardRef<HTMLFormElement, React.FormHTMLAttributes<HTMLFormElement>>(
  ({ className, ...props }, ref) => (
    <form ref={ref} className={cn('flex flex-col gap-[var(--space-lg)]', className)} {...props} />
  ),
);
Form.displayName = 'Form';

export interface FormFieldProps {
  /**
   * Required, not generated internally: keeping this a plain string (no
   * `useId`) means `FormField` stays a Server Component. Pass a stable id —
   * RHF's `register('name')`/`field.name` from `Controller` both work.
   */
  id: string;
  label: React.ReactNode;
  required?: boolean;
  hint?: React.ReactNode;
  error?: React.ReactNode;
  className?: string;
  /** Receives the computed `aria-describedby` value — spread it onto your input. */
  children: (field: {
    id: string;
    'aria-describedby': string | undefined;
    'aria-invalid': true | undefined;
  }) => React.ReactNode;
}

export function FormField({
  id,
  label,
  required,
  hint,
  error,
  className,
  children,
}: FormFieldProps) {
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(' ') || undefined;

  return (
    <div className={cn('flex flex-col gap-[var(--space-2xs)]', className)}>
      <Label htmlFor={id} required={required}>
        {label}
      </Label>
      {children({ id, 'aria-describedby': describedBy, 'aria-invalid': error ? true : undefined })}
      {hint ? (
        <ValidationMessage id={hintId} tone="hint">
          {hint}
        </ValidationMessage>
      ) : null}
      {error ? (
        <ValidationMessage id={errorId} tone="error">
          {error}
        </ValidationMessage>
      ) : null}
    </div>
  );
}
