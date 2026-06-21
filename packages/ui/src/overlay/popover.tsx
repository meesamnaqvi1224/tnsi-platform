'use client';

import * as React from 'react';
import { Popover as PopoverPrimitive } from '@base-ui/react/popover';
import { cn } from '../lib/cn';

export const PopoverRoot = PopoverPrimitive.Root;
export const PopoverTrigger = PopoverPrimitive.Trigger;
export const PopoverClose = PopoverPrimitive.Close;

export interface PopoverContentProps extends React.ComponentProps<typeof PopoverPrimitive.Popup> {
  side?: 'top' | 'right' | 'bottom' | 'left';
  align?: 'start' | 'center' | 'end';
  sideOffset?: number;
}

export const PopoverContent = React.forwardRef<HTMLDivElement, PopoverContentProps>(
  ({ className, side = 'bottom', align = 'center', sideOffset = 8, children, ...props }, ref) => (
    <PopoverPrimitive.Portal>
      <PopoverPrimitive.Positioner
        className="z-(--z-popover)"
        side={side}
        align={align}
        sideOffset={sideOffset}
      >
        <PopoverPrimitive.Popup
          ref={ref}
          className={cn(
            'w-72 rounded-md border border-border bg-popover p-4 text-sm text-popover-foreground shadow-md outline-none',
            'transition-all data-[starting-style]:scale-95 data-[starting-style]:opacity-0 data-[ending-style]:scale-95 data-[ending-style]:opacity-0',
            className,
          )}
          {...props}
        >
          {children}
        </PopoverPrimitive.Popup>
      </PopoverPrimitive.Positioner>
    </PopoverPrimitive.Portal>
  ),
);
PopoverContent.displayName = 'PopoverContent';
