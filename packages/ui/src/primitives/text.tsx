import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../lib/cn';

const textVariants = cva('text-foreground', {
  variants: {
    size: {
      xs: 'text-xs',
      sm: 'text-sm',
      md: 'text-base',
      lg: 'text-lg',
    },
    weight: {
      normal: 'font-normal',
      medium: 'font-medium',
      semibold: 'font-semibold',
    },
    tone: {
      default: 'text-foreground',
      muted: 'text-muted-foreground',
      success: 'text-success',
      warning: 'text-warning',
      destructive: 'text-destructive',
    },
  },
  defaultVariants: {
    size: 'md',
    weight: 'normal',
    tone: 'default',
  },
});

export interface TextProps
  extends
    React.HTMLAttributes<HTMLParagraphElement | HTMLSpanElement>,
    VariantProps<typeof textVariants> {
  as?: 'p' | 'span';
}

export const Text = React.forwardRef<HTMLParagraphElement, TextProps>(
  ({ className, size, weight, tone, as: Tag = 'p', ...props }, ref) => (
    <Tag
      ref={ref as React.Ref<never>}
      className={cn(textVariants({ size, weight, tone }), className)}
      {...props}
    />
  ),
);
Text.displayName = 'Text';
