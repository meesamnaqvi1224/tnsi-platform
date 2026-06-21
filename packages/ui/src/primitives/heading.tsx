import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../lib/cn';

const headingVariants = cva('font-heading font-semibold tracking-tight text-foreground', {
  variants: {
    size: {
      xs: 'text-lg',
      sm: 'text-xl',
      md: 'text-2xl',
      lg: 'text-3xl',
      xl: 'text-4xl',
      '2xl': 'text-5xl',
    },
  },
  defaultVariants: {
    size: 'md',
  },
});

type HeadingLevel = 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6';

export interface HeadingProps
  extends React.HTMLAttributes<HTMLHeadingElement>, VariantProps<typeof headingVariants> {
  /** The semantic heading level — choose this for document outline correctness, independent of visual `size`. */
  as: HeadingLevel;
}

export const Heading = React.forwardRef<HTMLHeadingElement, HeadingProps>(
  ({ className, size, as: Tag, ...props }, ref) => (
    <Tag ref={ref} className={cn(headingVariants({ size }), className)} {...props} />
  ),
);
Heading.displayName = 'Heading';
