import * as React from 'react';
import { cn } from '../lib/cn';

export interface ProgressProps extends React.HTMLAttributes<HTMLDivElement> {
  value: number;
  max?: number;
  label?: string;
}

export function Progress({ className, value, max = 100, label, ...props }: ProgressProps) {
  const percent = Math.min(100, Math.max(0, (value / max) * 100));
  return (
    <div
      role="progressbar"
      aria-valuenow={value}
      aria-valuemin={0}
      aria-valuemax={max}
      aria-label={label}
      className={cn('h-2 w-full overflow-hidden rounded-full bg-muted', className)}
      {...props}
    >
      <div
        className="h-full rounded-full bg-primary transition-[width] duration-base ease-standard"
        style={{ width: `${percent}%` }}
      />
    </div>
  );
}
