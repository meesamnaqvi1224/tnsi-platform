import * as React from 'react';
import { Loader2 } from 'lucide-react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../lib/cn';

const spinnerVariants = cva('animate-spin text-muted-foreground', {
  variants: {
    size: {
      sm: 'size-4',
      md: 'size-6',
      lg: 'size-8',
    },
  },
  defaultVariants: {
    size: 'md',
  },
});

export interface SpinnerProps
  extends React.SVGAttributes<SVGSVGElement>, VariantProps<typeof spinnerVariants> {
  /** Accessible label for the loading state — required since spinners carry no text. */
  label?: string;
}

export function Spinner({ className, size, label = 'Loading…', ...props }: SpinnerProps) {
  return (
    <span role="status">
      <Loader2 aria-hidden="true" className={cn(spinnerVariants({ size }), className)} {...props} />
      <span className="sr-only">{label}</span>
    </span>
  );
}
