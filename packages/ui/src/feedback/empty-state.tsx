import * as React from 'react';
import { cn } from '../lib/cn';

export interface EmptyStateProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'title'> {
  icon?: React.ReactNode;
  title: React.ReactNode;
  description?: React.ReactNode;
  action?: React.ReactNode;
}

export function EmptyState({
  className,
  icon,
  title,
  description,
  action,
  ...props
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center gap-[var(--space-sm)] rounded-lg border border-dashed border-border p-[var(--space-2xl)] text-center',
        className,
      )}
      {...props}
    >
      {icon ? <div className="text-muted-foreground">{icon}</div> : null}
      <p className="text-base font-medium text-foreground">{title}</p>
      {description ? <p className="max-w-sm text-sm text-muted-foreground">{description}</p> : null}
      {action ? <div className="mt-[var(--space-xs)]">{action}</div> : null}
    </div>
  );
}
