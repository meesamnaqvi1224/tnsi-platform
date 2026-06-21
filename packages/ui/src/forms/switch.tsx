'use client';

import * as React from 'react';
import { Switch as SwitchPrimitive } from '@base-ui/react/switch';
import { cn } from '../lib/cn';

export type SwitchProps = React.ComponentProps<typeof SwitchPrimitive.Root>;

/** RHF: use `<Controller>`, mapping `checked`/`onCheckedChange` to `field.value`/`field.onChange`. */
export const Switch = React.forwardRef<HTMLElement, SwitchProps>(({ className, ...props }, ref) => (
  <SwitchPrimitive.Root
    ref={ref}
    className={cn(
      'inline-flex h-5 w-9 shrink-0 items-center rounded-full border border-transparent bg-input transition-colors',
      'data-[checked]:bg-primary',
      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
      'data-[disabled]:cursor-not-allowed data-[disabled]:opacity-50',
      className,
    )}
    {...props}
  >
    <SwitchPrimitive.Thumb
      className={cn(
        'pointer-events-none block size-4 translate-x-0.5 rounded-full bg-background shadow-sm transition-transform duration-base ease-standard',
        'data-[checked]:translate-x-[1.125rem]',
      )}
    />
  </SwitchPrimitive.Root>
));
Switch.displayName = 'Switch';
