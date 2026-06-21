import * as React from 'react';
import { cn } from '../lib/cn';

export interface LabelProps extends React.LabelHTMLAttributes<HTMLLabelElement> {
  required?: boolean;
}

export const Label = React.forwardRef<HTMLLabelElement, LabelProps>(
  ({ className, required, children, ...props }, ref) => (
    <label
      ref={ref}
      className={cn(
        'text-sm font-medium leading-none text-foreground peer-disabled:cursor-not-allowed peer-disabled:opacity-70',
        className,
      )}
      {...props}
    >
      {children}
      {required ? (
        <span aria-hidden="true" className="ml-0.5 text-destructive">
          *
        </span>
      ) : null}
    </label>
  ),
);
Label.displayName = 'Label';
