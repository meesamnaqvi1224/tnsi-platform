import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../lib/cn';

const gridVariants = cva('grid', {
  variants: {
    cols: {
      '1': 'grid-cols-1',
      '2': 'grid-cols-1 sm:grid-cols-2',
      '3': 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
      '4': 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4',
      '6': 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-6',
      '12': 'grid-cols-12',
    },
    gap: {
      none: 'gap-0',
      sm: 'gap-[var(--space-sm)]',
      md: 'gap-[var(--space-md)]',
      lg: 'gap-[var(--space-lg)]',
      xl: 'gap-[var(--space-xl)]',
    },
  },
  defaultVariants: {
    cols: '1',
    gap: 'md',
  },
});

export interface GridProps
  extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof gridVariants> {}

export const Grid = React.forwardRef<HTMLDivElement, GridProps>(
  ({ className, cols, gap, ...props }, ref) => (
    <div ref={ref} className={cn(gridVariants({ cols, gap }), className)} {...props} />
  ),
);
Grid.displayName = 'Grid';
