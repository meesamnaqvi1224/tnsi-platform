'use client';

import * as React from 'react';
import { Checkbox as CheckboxPrimitive } from '@base-ui/react/checkbox';
import { Check, Minus } from 'lucide-react';
import { cn } from '../lib/cn';

export type CheckboxProps = Omit<React.ComponentProps<typeof CheckboxPrimitive.Root>, 'render'>;

/**
 * RHF: native `register()` doesn't apply (no real `<input type="checkbox">`
 * in the tree under your control). Use `<Controller>` and map
 * `checked={field.value}` / `onCheckedChange={field.onChange}` /
 * `inputRef={field.ref}`.
 */
export const Checkbox = React.forwardRef<HTMLElement, CheckboxProps>(
  ({ className, ...props }, ref) => (
    <CheckboxPrimitive.Root
      ref={ref}
      className={cn(
        'peer flex size-4 shrink-0 items-center justify-center rounded-sm border border-input shadow-xs transition-colors',
        'data-[checked]:border-primary data-[checked]:bg-primary data-[checked]:text-primary-foreground',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
        'data-[disabled]:cursor-not-allowed data-[disabled]:opacity-50',
        className,
      )}
      {...props}
    >
      <CheckboxPrimitive.Indicator className="flex items-center justify-center text-current">
        {props.indeterminate ? <Minus className="size-3" /> : <Check className="size-3" />}
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  ),
);
Checkbox.displayName = 'Checkbox';
