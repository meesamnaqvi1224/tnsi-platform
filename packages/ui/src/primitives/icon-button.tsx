import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../lib/cn';
import { buttonVariants } from './button';

const iconButtonVariants = cva('rounded-full', {
  variants: {
    size: {
      sm: 'size-8',
      md: 'size-9',
      lg: 'size-10',
    },
  },
  defaultVariants: {
    size: 'md',
  },
});

export interface IconButtonProps
  extends
    Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'children'>,
    Pick<VariantProps<typeof buttonVariants>, 'variant'>,
    VariantProps<typeof iconButtonVariants> {
  /** Required: icon-only buttons have no visible text, so an accessible label is mandatory. */
  'aria-label': string;
  icon: React.ReactNode;
}

export const IconButton = React.forwardRef<HTMLButtonElement, IconButtonProps>(
  ({ className, variant = 'ghost', size, icon, type = 'button', ...props }, ref) => {
    return (
      <button
        ref={ref}
        type={type}
        className={cn(buttonVariants({ variant }), iconButtonVariants({ size }), 'p-0', className)}
        {...props}
      >
        {icon}
      </button>
    );
  },
);
IconButton.displayName = 'IconButton';
