'use client';

import * as React from 'react';
import { RadioGroup as RadioGroupPrimitive } from '@base-ui/react/radio-group';
import { Radio as RadioPrimitive } from '@base-ui/react/radio';
import { cn } from '../lib/cn';

export type RadioGroupProps = React.ComponentProps<typeof RadioGroupPrimitive>;

/** RHF: use `<Controller>`, mapping `value`/`onValueChange` to `field.value`/`field.onChange`. */
export const RadioGroup = React.forwardRef<HTMLDivElement, RadioGroupProps>(
  ({ className, ...props }, ref) => (
    <RadioGroupPrimitive
      ref={ref}
      className={cn('flex flex-col gap-[var(--space-xs)]', className)}
      {...props}
    />
  ),
);
RadioGroup.displayName = 'RadioGroup';

export type RadioItemProps = React.ComponentProps<typeof RadioPrimitive.Root>;

export const RadioItem = React.forwardRef<HTMLElement, RadioItemProps>(
  ({ className, ...props }, ref) => (
    <RadioPrimitive.Root
      ref={ref}
      className={cn(
        'flex size-4 shrink-0 items-center justify-center rounded-full border border-input shadow-xs transition-colors',
        'data-[checked]:border-primary',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
        'data-[disabled]:cursor-not-allowed data-[disabled]:opacity-50',
        className,
      )}
      {...props}
    >
      <RadioPrimitive.Indicator className="size-2 rounded-full bg-primary data-[unchecked]:hidden" />
    </RadioPrimitive.Root>
  ),
);
RadioItem.displayName = 'RadioItem';
