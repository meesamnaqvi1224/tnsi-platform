'use client';

import * as React from 'react';
import { Drawer as DrawerPrimitive } from '@base-ui/react/drawer';
import { X } from 'lucide-react';
import { cn } from '../lib/cn';
import { IconButton } from '../primitives/icon-button';

export const DrawerRoot = DrawerPrimitive.Root;
export const DrawerTrigger = DrawerPrimitive.Trigger;
export const DrawerClose = DrawerPrimitive.Close;

const sideClasses = {
  right:
    'inset-y-0 right-0 h-full w-full max-w-sm border-l data-[starting-style]:translate-x-full data-[ending-style]:translate-x-full',
  left: 'inset-y-0 left-0 h-full w-full max-w-sm border-r data-[starting-style]:-translate-x-full data-[ending-style]:-translate-x-full',
  bottom:
    'inset-x-0 bottom-0 max-h-[80vh] w-full border-t data-[starting-style]:translate-y-full data-[ending-style]:translate-y-full',
  top: 'inset-x-0 top-0 max-h-[80vh] w-full border-b data-[starting-style]:-translate-y-full data-[ending-style]:-translate-y-full',
} as const;

export interface DrawerContentProps extends Omit<
  React.ComponentProps<typeof DrawerPrimitive.Popup>,
  'title'
> {
  title: React.ReactNode;
  description?: React.ReactNode;
  side?: keyof typeof sideClasses;
  showCloseButton?: boolean;
}

export const DrawerContent = React.forwardRef<HTMLDivElement, DrawerContentProps>(
  (
    { className, title, description, side = 'right', showCloseButton = true, children, ...props },
    ref,
  ) => (
    <DrawerPrimitive.Portal>
      <DrawerPrimitive.Backdrop className="fixed inset-0 z-(--z-modal-backdrop) bg-black/50 transition-opacity data-[starting-style]:opacity-0 data-[ending-style]:opacity-0" />
      <DrawerPrimitive.Viewport>
        <DrawerPrimitive.Popup
          ref={ref}
          className={cn(
            'fixed z-(--z-drawer) flex flex-col border-border bg-card p-6 text-card-foreground shadow-xl transition-transform',
            sideClasses[side],
            className,
          )}
          {...props}
        >
          <DrawerPrimitive.Title className="text-lg font-semibold leading-none">
            {title}
          </DrawerPrimitive.Title>
          {description ? (
            <DrawerPrimitive.Description className="mt-2 text-sm text-muted-foreground">
              {description}
            </DrawerPrimitive.Description>
          ) : null}
          <div className="mt-4 flex-1 overflow-y-auto">{children}</div>
          {showCloseButton ? (
            <DrawerPrimitive.Close
              render={
                <IconButton
                  aria-label="Close"
                  icon={<X className="size-4" />}
                  variant="ghost"
                  size="sm"
                  className="absolute right-3 top-3"
                />
              }
            />
          ) : null}
        </DrawerPrimitive.Popup>
      </DrawerPrimitive.Viewport>
    </DrawerPrimitive.Portal>
  ),
);
DrawerContent.displayName = 'DrawerContent';
