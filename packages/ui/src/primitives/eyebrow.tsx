import * as React from 'react';
import { cn } from '../lib/cn';

export interface EyebrowProps extends React.HTMLAttributes<HTMLParagraphElement> {
  as?: 'p' | 'span';
}

/** Small-caps section label, e.g. "THE FRAMEWORK" above a heading. */
export const Eyebrow = React.forwardRef<HTMLParagraphElement, EyebrowProps>(
  ({ className, as: Tag = 'p', ...props }, ref) => (
    <Tag
      ref={ref as React.Ref<never>}
      className={cn(
        'text-xs font-medium tracking-[0.15em] text-muted-foreground uppercase',
        className,
      )}
      {...props}
    />
  ),
);
Eyebrow.displayName = 'Eyebrow';
