'use client';

import * as React from 'react';
import { Tooltip as TooltipPrimitive } from '@base-ui/react/tooltip';
import { cn } from '../lib/cn';

export const TooltipProvider = TooltipPrimitive.Provider;
export const TooltipRoot = TooltipPrimitive.Root;
export const TooltipTrigger = TooltipPrimitive.Trigger;

export interface TooltipContentProps extends React.ComponentProps<typeof TooltipPrimitive.Popup> {
  side?: 'top' | 'right' | 'bottom' | 'left';
  sideOffset?: number;
}

export const TooltipContent = React.forwardRef<HTMLDivElement, TooltipContentProps>(
  ({ className, side = 'top', sideOffset = 6, children, ...props }, ref) => (
    <TooltipPrimitive.Portal>
      <TooltipPrimitive.Positioner className="z-(--z-tooltip)" side={side} sideOffset={sideOffset}>
        <TooltipPrimitive.Popup
          ref={ref}
          className={cn(
            'rounded-md bg-foreground px-2.5 py-1.5 text-xs text-background shadow-md',
            'transition-all data-[starting-style]:scale-95 data-[starting-style]:opacity-0 data-[ending-style]:scale-95 data-[ending-style]:opacity-0',
            className,
          )}
          {...props}
        >
          {children}
        </TooltipPrimitive.Popup>
      </TooltipPrimitive.Positioner>
    </TooltipPrimitive.Portal>
  ),
);
TooltipContent.displayName = 'TooltipContent';
