import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { AlertCircle, CheckCircle2, Info, TriangleAlert } from 'lucide-react';
import { cn } from '../lib/cn';

const alertVariants = cva(
  'relative flex w-full gap-3 rounded-lg border p-4 text-sm [&>svg]:size-4 [&>svg]:shrink-0 [&>svg]:translate-y-0.5',
  {
    variants: {
      variant: {
        default: 'border-border bg-background text-foreground',
        info: 'border-info/30 bg-info/10 text-foreground [&>svg]:text-info',
        success: 'border-success/30 bg-success/10 text-foreground [&>svg]:text-success',
        warning: 'border-warning/30 bg-warning/10 text-foreground [&>svg]:text-warning',
        destructive:
          'border-destructive/30 bg-destructive/10 text-foreground [&>svg]:text-destructive',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  },
);

const defaultIcon = {
  default: Info,
  info: Info,
  success: CheckCircle2,
  warning: TriangleAlert,
  destructive: AlertCircle,
} as const;

export interface AlertProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, 'title'>, VariantProps<typeof alertVariants> {
  title?: React.ReactNode;
  icon?: React.ReactNode | null;
}

export function Alert({
  className,
  variant = 'default',
  title,
  icon,
  children,
  ...props
}: AlertProps) {
  const Icon = defaultIcon[variant ?? 'default'];
  return (
    <div role="alert" className={cn(alertVariants({ variant }), className)} {...props}>
      {icon === null ? null : (icon ?? <Icon aria-hidden="true" />)}
      <div className="flex flex-col gap-1">
        {title ? <p className="font-medium leading-none">{title}</p> : null}
        {children ? <div className="text-muted-foreground">{children}</div> : null}
      </div>
    </div>
  );
}
