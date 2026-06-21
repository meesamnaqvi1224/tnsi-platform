import * as React from 'react';
import { cn } from '../lib/cn';

export interface ValidationMessageProps extends React.HTMLAttributes<HTMLParagraphElement> {
  tone?: 'error' | 'hint';
}

/**
 * Pair this element's `id` with the field's `aria-describedby` so assistive
 * tech announces it. `role="alert"` only applies to error-tone messages —
 * hints shouldn't interrupt.
 */
export const ValidationMessage = React.forwardRef<HTMLParagraphElement, ValidationMessageProps>(
  ({ className, tone = 'error', ...props }, ref) => (
    <p
      ref={ref}
      role={tone === 'error' ? 'alert' : undefined}
      className={cn(
        'text-sm',
        tone === 'error' ? 'text-destructive' : 'text-muted-foreground',
        className,
      )}
      {...props}
    />
  ),
);
ValidationMessage.displayName = 'ValidationMessage';
