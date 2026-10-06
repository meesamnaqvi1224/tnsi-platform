import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../lib/cn';

const linkVariants = cva(
  'underline-offset-4 transition-colors duration-base ease-standard focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-sm',
  {
    variants: {
      tone: {
        default: 'text-primary hover:underline',
        muted: 'text-muted-foreground hover:text-foreground hover:underline',
        inherit: 'text-inherit hover:underline',
      },
    },
    defaultVariants: {
      tone: 'default',
    },
  },
);

/**
 * Equivalent to `React.ElementType<AnchorHTMLAttributes>` for the only cases
 * that matter here (a plain `<a>` or a router link component), but without
 * expanding to every intrinsic JSX element. That expansion becomes
 * pathologically large (TS2590) once a package such as React Three Fiber adds
 * hundreds of its own elements to the global JSX namespace.
 */
type AnchorComponent = 'a' | React.ComponentType<React.AnchorHTMLAttributes<HTMLAnchorElement>>;

export interface LinkProps
  extends React.AnchorHTMLAttributes<HTMLAnchorElement>, VariantProps<typeof linkVariants> {
  /**
   * Component to render as, e.g. your app router's `Link` (`next/link`).
   * Defaults to a plain `<a>` so this package has no router dependency.
   */
  as?: AnchorComponent;
}

export const Link = React.forwardRef<HTMLAnchorElement, LinkProps>(
  ({ className, tone, as: Component = 'a', ...props }, ref) => (
    <Component ref={ref} className={cn(linkVariants({ tone }), className)} {...props} />
  ),
);
Link.displayName = 'Link';
