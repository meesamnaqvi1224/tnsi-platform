'use client';

import * as React from 'react';
import { Dialog as DialogPrimitive } from '@base-ui/react/dialog';
import { X } from 'lucide-react';
import { cn } from '../lib/cn';
import { IconButton } from '../primitives/icon-button';

export const ModalRoot = DialogPrimitive.Root;
export const ModalTrigger = DialogPrimitive.Trigger;
export const ModalClose = DialogPrimitive.Close;

export interface ModalContentProps extends Omit<
  React.ComponentProps<typeof DialogPrimitive.Popup>,
  'title'
> {
  title: React.ReactNode;
  description?: React.ReactNode;
  /** Set to `false` only when the dialog provides its own close affordance. */
  showCloseButton?: boolean;
}

export const ModalContent = React.forwardRef<HTMLDivElement, ModalContentProps>(
  ({ className, title, description, showCloseButton = true, children, ...props }, ref) => (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Backdrop className="fixed inset-0 z-(--z-modal-backdrop) bg-black/50 transition-opacity data-[starting-style]:opacity-0 data-[ending-style]:opacity-0" />
      <DialogPrimitive.Popup
        ref={ref}
        className={cn(
          'fixed left-1/2 top-1/2 z-(--z-modal) w-full max-w-lg -translate-x-1/2 -translate-y-1/2 rounded-lg border border-border bg-card p-6 text-card-foreground shadow-xl',
          'transition-all data-[starting-style]:scale-95 data-[starting-style]:opacity-0 data-[ending-style]:scale-95 data-[ending-style]:opacity-0',
          className,
        )}
        {...props}
      >
        <DialogPrimitive.Title className="text-lg font-semibold leading-none">
          {title}
        </DialogPrimitive.Title>
        {description ? (
          <DialogPrimitive.Description className="mt-2 text-sm text-muted-foreground">
            {description}
          </DialogPrimitive.Description>
        ) : null}
        <div className="mt-4">{children}</div>
        {showCloseButton ? (
          <DialogPrimitive.Close
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
      </DialogPrimitive.Popup>
    </DialogPrimitive.Portal>
  ),
);
ModalContent.displayName = 'ModalContent';
