'use client';

import * as React from 'react';
import { Menu as MenuPrimitive } from '@base-ui/react/menu';
import { Check } from 'lucide-react';
import { cn } from '../lib/cn';

export const DropdownRoot = MenuPrimitive.Root;
export const DropdownTrigger = MenuPrimitive.Trigger;
export const DropdownGroup = MenuPrimitive.Group;
export const DropdownGroupLabel = MenuPrimitive.GroupLabel;

export interface DropdownContentProps extends React.ComponentProps<typeof MenuPrimitive.Popup> {
  side?: 'top' | 'right' | 'bottom' | 'left';
  align?: 'start' | 'center' | 'end';
  sideOffset?: number;
}

export const DropdownContent = React.forwardRef<HTMLDivElement, DropdownContentProps>(
  ({ className, side = 'bottom', align = 'start', sideOffset = 4, children, ...props }, ref) => (
    <MenuPrimitive.Portal>
      <MenuPrimitive.Positioner
        className="z-(--z-dropdown)"
        side={side}
        align={align}
        sideOffset={sideOffset}
      >
        <MenuPrimitive.Popup
          ref={ref}
          className={cn(
            'min-w-40 rounded-md border border-border bg-popover p-1 text-popover-foreground shadow-md outline-none',
            'transition-all data-[starting-style]:scale-95 data-[starting-style]:opacity-0 data-[ending-style]:scale-95 data-[ending-style]:opacity-0',
            className,
          )}
          {...props}
        >
          {children}
        </MenuPrimitive.Popup>
      </MenuPrimitive.Positioner>
    </MenuPrimitive.Portal>
  ),
);
DropdownContent.displayName = 'DropdownContent';

export interface DropdownItemProps extends React.ComponentProps<typeof MenuPrimitive.Item> {
  destructive?: boolean;
}

export const DropdownItem = React.forwardRef<HTMLElement, DropdownItemProps>(
  ({ className, destructive, ...props }, ref) => (
    <MenuPrimitive.Item
      ref={ref}
      className={cn(
        'flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none',
        'data-[highlighted]:bg-accent data-[highlighted]:text-accent-foreground',
        'data-[disabled]:pointer-events-none data-[disabled]:opacity-50',
        destructive &&
          'text-destructive data-[highlighted]:bg-destructive/10 data-[highlighted]:text-destructive',
        className,
      )}
      {...props}
    />
  ),
);
DropdownItem.displayName = 'DropdownItem';

export type DropdownCheckboxItemProps = React.ComponentProps<typeof MenuPrimitive.CheckboxItem>;

export const DropdownCheckboxItem = React.forwardRef<HTMLElement, DropdownCheckboxItemProps>(
  ({ className, children, ...props }, ref) => (
    <MenuPrimitive.CheckboxItem
      ref={ref}
      className={cn(
        'flex cursor-default select-none items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none',
        'data-[highlighted]:bg-accent data-[highlighted]:text-accent-foreground',
        'data-[disabled]:pointer-events-none data-[disabled]:opacity-50',
        className,
      )}
      {...props}
    >
      <span className="flex size-4 items-center justify-center">
        <MenuPrimitive.CheckboxItemIndicator>
          <Check className="size-4" />
        </MenuPrimitive.CheckboxItemIndicator>
      </span>
      {children}
    </MenuPrimitive.CheckboxItem>
  ),
);
DropdownCheckboxItem.displayName = 'DropdownCheckboxItem';

export function DropdownSeparator({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div role="separator" className={cn('-mx-1 my-1 h-px bg-border', className)} {...props} />;
}
