'use client';

import * as React from 'react';
import { Avatar as AvatarPrimitive } from '@base-ui/react/avatar';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../lib/cn';

const avatarVariants = cva(
  'relative flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-muted',
  {
    variants: {
      size: {
        sm: 'size-8 text-xs',
        md: 'size-10 text-sm',
        lg: 'size-14 text-base',
      },
    },
    defaultVariants: {
      size: 'md',
    },
  },
);

export interface AvatarProps
  extends React.ComponentProps<typeof AvatarPrimitive.Root>, VariantProps<typeof avatarVariants> {
  src?: string;
  alt?: string;
  /** Shown when `src` is absent or fails to load — typically initials. */
  fallback: React.ReactNode;
}

export const Avatar = React.forwardRef<HTMLSpanElement, AvatarProps>(
  ({ className, size, src, alt = '', fallback, ...props }, ref) => (
    <AvatarPrimitive.Root ref={ref} className={cn(avatarVariants({ size }), className)} {...props}>
      {src ? (
        <AvatarPrimitive.Image src={src} alt={alt} className="size-full object-cover" />
      ) : null}
      <AvatarPrimitive.Fallback className="font-medium text-muted-foreground">
        {fallback}
      </AvatarPrimitive.Fallback>
    </AvatarPrimitive.Root>
  ),
);
Avatar.displayName = 'Avatar';
