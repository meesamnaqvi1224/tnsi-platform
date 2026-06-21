import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../lib/cn';

const sectionVariants = cva('w-full', {
  variants: {
    spacing: {
      none: 'py-0',
      sm: 'py-[var(--space-xl)]',
      md: 'py-[var(--space-2xl)]',
      lg: 'py-[var(--space-3xl)]',
      xl: 'py-[var(--space-4xl)]',
    },
  },
  defaultVariants: {
    spacing: 'md',
  },
});

export interface SectionProps
  extends React.HTMLAttributes<HTMLElement>, VariantProps<typeof sectionVariants> {
  as?: 'section' | 'div' | 'article' | 'aside';
}

export const Section = React.forwardRef<HTMLElement, SectionProps>(
  ({ className, spacing, as: Tag = 'section', ...props }, ref) => (
    <Tag
      ref={ref as React.Ref<never>}
      className={cn(sectionVariants({ spacing }), className)}
      {...props}
    />
  ),
);
Section.displayName = 'Section';
