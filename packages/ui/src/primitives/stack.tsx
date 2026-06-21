import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../lib/cn';

const stackVariants = cva('flex', {
  variants: {
    direction: {
      row: 'flex-row',
      column: 'flex-col',
    },
    align: {
      start: 'items-start',
      center: 'items-center',
      end: 'items-end',
      stretch: 'items-stretch',
      baseline: 'items-baseline',
    },
    justify: {
      start: 'justify-start',
      center: 'justify-center',
      end: 'justify-end',
      between: 'justify-between',
      around: 'justify-around',
    },
    wrap: {
      wrap: 'flex-wrap',
      nowrap: 'flex-nowrap',
    },
    gap: {
      '3xs': 'gap-[var(--space-3xs)]',
      '2xs': 'gap-[var(--space-2xs)]',
      xs: 'gap-[var(--space-xs)]',
      sm: 'gap-[var(--space-sm)]',
      md: 'gap-[var(--space-md)]',
      lg: 'gap-[var(--space-lg)]',
      xl: 'gap-[var(--space-xl)]',
      '2xl': 'gap-[var(--space-2xl)]',
      '3xl': 'gap-[var(--space-3xl)]',
      '4xl': 'gap-[var(--space-4xl)]',
      none: 'gap-0',
    },
  },
  defaultVariants: {
    direction: 'column',
    align: 'stretch',
    justify: 'start',
    wrap: 'nowrap',
    gap: 'md',
  },
});

export interface StackProps
  extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof stackVariants> {}

export const Stack = React.forwardRef<HTMLDivElement, StackProps>(
  ({ className, direction, align, justify, wrap, gap, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(stackVariants({ direction, align, justify, wrap, gap }), className)}
      {...props}
    />
  ),
);
Stack.displayName = 'Stack';
