import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../lib/cn';

const dividerVariants = cva('shrink-0 bg-border', {
  variants: {
    orientation: {
      horizontal: 'h-px w-full',
      vertical: 'h-full w-px',
    },
  },
  defaultVariants: {
    orientation: 'horizontal',
  },
});

export interface DividerProps
  extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof dividerVariants> {}

/** Decorative by default (`role="presentation"`). Pass `aria-orientation` only if it carries semantic meaning in context. */
export const Divider = React.forwardRef<HTMLDivElement, DividerProps>(
  ({ className, orientation, role = 'presentation', ...props }, ref) => (
    <div
      ref={ref}
      role={role}
      className={cn(dividerVariants({ orientation }), className)}
      {...props}
    />
  ),
);
Divider.displayName = 'Divider';
