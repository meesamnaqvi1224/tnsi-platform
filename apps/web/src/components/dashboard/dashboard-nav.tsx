'use client';

import NextLink from 'next/link';
import { usePathname } from 'next/navigation';
import { cn, Container } from '@tnsi/ui';

const links = [
  { label: 'Dashboard', href: '/dashboard' },
  { label: 'Practices', href: '/dashboard/practices' },
  { label: 'Billing', href: '/dashboard/billing' },
] as const;

function isActive(pathname: string, href: string): boolean {
  if (href === '/dashboard') return pathname === '/dashboard';
  return pathname === href || pathname.startsWith(`${href}/`);
}

/** Persistent sub-nav for the member dashboard, distinct from the public SiteHeader nav above it. */
export function DashboardNav() {
  const pathname = usePathname();

  return (
    <nav aria-label="Dashboard" className="border-border bg-background border-b">
      <Container size="xl">
        <div className="flex gap-(--space-xl)">
          {links.map((link) => {
            const active = isActive(pathname, link.href);
            return (
              <NextLink
                key={link.href}
                href={link.href}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'interaction-colors interaction-focus border-b-2 py-(--space-md) text-sm font-medium',
                  active
                    ? 'border-foreground text-foreground'
                    : 'text-muted-foreground hover:text-foreground border-transparent',
                )}
              >
                {link.label}
              </NextLink>
            );
          })}
        </div>
      </Container>
    </nav>
  );
}
