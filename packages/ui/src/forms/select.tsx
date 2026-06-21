'use client';

import * as React from 'react';
import { Select as SelectPrimitive } from '@base-ui/react/select';
import { Check, ChevronDown } from 'lucide-react';
import { cn } from '../lib/cn';

export const SelectRoot = SelectPrimitive.Root;

export type SelectTriggerProps = React.ComponentProps<typeof SelectPrimitive.Trigger>;

export const SelectTrigger = React.forwardRef<HTMLButtonElement, SelectTriggerProps>(
  ({ className, children, ...props }, ref) => (
    <SelectPrimitive.Trigger
      ref={ref}
      className={cn(
        'flex h-9 w-full items-center justify-between gap-2 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-xs transition-colors',
        'data-[placeholder]:text-muted-foreground',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
        'data-[disabled]:cursor-not-allowed data-[disabled]:opacity-50',
        className,
      )}
      {...props}
    >
      {children}
      <SelectPrimitive.Icon>
        <ChevronDown className="size-4 opacity-50" />
      </SelectPrimitive.Icon>
    </SelectPrimitive.Trigger>
  ),
);
SelectTrigger.displayName = 'SelectTrigger';

export const SelectValue = SelectPrimitive.Value;

export type SelectContentProps = React.ComponentProps<typeof SelectPrimitive.Popup>;

export const SelectContent = React.forwardRef<HTMLDivElement, SelectContentProps>(
  ({ className, children, ...props }, ref) => (
    <SelectPrimitive.Portal>
      <SelectPrimitive.Positioner className="z-(--z-dropdown)" sideOffset={4}>
        <SelectPrimitive.Popup
          ref={ref}
          className={cn(
            'max-h-72 min-w-[var(--anchor-width)] overflow-y-auto rounded-md border border-border bg-popover p-1 text-popover-foreground shadow-md',
            className,
          )}
          {...props}
        >
          {children}
        </SelectPrimitive.Popup>
      </SelectPrimitive.Positioner>
    </SelectPrimitive.Portal>
  ),
);
SelectContent.displayName = 'SelectContent';

export type SelectItemProps = React.ComponentProps<typeof SelectPrimitive.Item>;

export const SelectItem = React.forwardRef<HTMLDivElement, SelectItemProps>(
  ({ className, children, ...props }, ref) => (
    <SelectPrimitive.Item
      ref={ref}
      className={cn(
        'relative flex cursor-default select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm outline-none',
        'data-[highlighted]:bg-accent data-[highlighted]:text-accent-foreground',
        'data-[disabled]:pointer-events-none data-[disabled]:opacity-50',
        className,
      )}
      {...props}
    >
      <span className="absolute left-2 flex size-4 items-center justify-center">
        <SelectPrimitive.ItemIndicator>
          <Check className="size-4" />
        </SelectPrimitive.ItemIndicator>
      </span>
      <SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>
    </SelectPrimitive.Item>
  ),
);
SelectItem.displayName = 'SelectItem';
