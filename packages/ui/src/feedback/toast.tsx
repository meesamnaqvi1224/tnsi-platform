'use client';

import * as React from 'react';
import { Toast as ToastPrimitive } from '@base-ui/react/toast';
import { X } from 'lucide-react';
import { cn } from '../lib/cn';

/**
 * Module-level manager so `toast.add(...)` works from anywhere (event
 * handlers, server action error callbacks) without needing a hook —
 * `<ToastProvider>` is given this same instance via `toastManager`.
 */
export const toastManager = ToastPrimitive.createToastManager();

export const useToast = ToastPrimitive.useToastManager;

export function ToastProvider({
  children,
  ...props
}: React.ComponentProps<typeof ToastPrimitive.Provider>) {
  return (
    <ToastPrimitive.Provider toastManager={toastManager} {...props}>
      {children}
      <Toaster />
    </ToastPrimitive.Provider>
  );
}

const toastVariants: Record<string, string> = {
  success: 'border-success/30 [&_[data-toast-title]]:text-success',
  error: 'border-destructive/30 [&_[data-toast-title]]:text-destructive',
  warning: 'border-warning/30 [&_[data-toast-title]]:text-warning',
};

function Toaster() {
  const { toasts } = ToastPrimitive.useToastManager();

  return (
    <ToastPrimitive.Portal>
      <ToastPrimitive.Viewport className="fixed bottom-4 right-4 z-(--z-toast) flex w-80 flex-col gap-2 outline-none">
        {toasts.map((toast) => (
          <ToastPrimitive.Root
            key={toast.id}
            toast={toast}
            className={cn(
              'relative flex flex-col gap-1 rounded-lg border border-border bg-popover p-4 text-popover-foreground shadow-lg',
              'transition-all data-[starting-style]:translate-x-full data-[ending-style]:opacity-0',
              toast.type ? toastVariants[toast.type] : undefined,
            )}
          >
            {toast.title ? (
              <ToastPrimitive.Title data-toast-title className="text-sm font-medium">
                {toast.title}
              </ToastPrimitive.Title>
            ) : null}
            {toast.description ? (
              <ToastPrimitive.Description className="text-sm text-muted-foreground">
                {toast.description}
              </ToastPrimitive.Description>
            ) : null}
            <ToastPrimitive.Close
              aria-label="Dismiss"
              className="absolute right-2 top-2 rounded-xs text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <X className="size-4" />
            </ToastPrimitive.Close>
          </ToastPrimitive.Root>
        ))}
      </ToastPrimitive.Viewport>
    </ToastPrimitive.Portal>
  );
}
