'use client';

import * as React from 'react';
import NextLink from 'next/link';
import { usePathname } from 'next/navigation';
import { SignOutButton } from '@clerk/nextjs';
import {
  Award,
  BookOpen,
  Calendar,
  FileText,
  GraduationCap,
  HelpCircle,
  Home,
  LogOut,
  type LucideIcon,
  Menu,
  Presentation,
  Sparkles,
  Users,
  Zap,
} from 'lucide-react';
import {
  Badge,
  cn,
  DrawerClose,
  DrawerContent,
  DrawerRoot,
  DrawerTrigger,
  IconButton,
  Stack,
} from '@tnsi/ui';

interface NavItem {
  label: string;
  icon: LucideIcon;
  /** Present only for items with a real, working destination today. */
  href?: string;
}

/**
 * The full Academy navigation Caroline's reference screenshots establish —
 * `Practices` and `Billing` are this repo's real, already-working
 * equivalents and link out; every other item is a later roadmap phase
 * (see the phase list in the brief) with no real data source yet, so it's
 * shown — establishing the intended architecture — but not linked, per
 * "do not build fake UI for functionality that does not have a real data
 * source."
 */
const navItems: NavItem[] = [
  { label: 'Academy Home', icon: Home, href: '/dashboard' },
  { label: 'My Learning', icon: BookOpen },
  { label: 'Practices', icon: Sparkles, href: '/dashboard/practices' },
  { label: 'Programs', icon: GraduationCap },
  { label: 'Workshops', icon: Presentation },
  { label: 'Resources', icon: FileText },
  { label: 'Community', icon: Users },
  { label: 'Live Events', icon: Calendar },
  { label: 'Certification', icon: Award },
];

function isActive(pathname: string, href: string): boolean {
  if (href === '/dashboard') return pathname === '/dashboard';
  return pathname === href || pathname.startsWith(`${href}/`);
}

function NavRowContent({ item }: { item: NavItem }) {
  const Icon = item.icon;
  return (
    <>
      <Icon aria-hidden className="size-4 shrink-0" />
      <span className="flex-1">{item.label}</span>
      {!item.href ? (
        <Badge
          variant="outline"
          className="border-foreground/20 text-muted-foreground text-[0.65rem]"
        >
          Soon
        </Badge>
      ) : null}
    </>
  );
}

const linkClass = (active: boolean) =>
  cn(
    'interaction-colors interaction-focus flex items-center gap-3 rounded-sm px-3 py-2 text-sm',
    active
      ? 'bg-foreground/10 text-foreground font-medium'
      : 'text-muted-foreground hover:bg-foreground/5 hover:text-foreground',
  );

const disabledClass =
  'text-muted-foreground/60 flex cursor-not-allowed items-center gap-3 rounded-sm px-3 py-2 text-sm';

function PowerDropsCallout() {
  return (
    <div
      aria-disabled="true"
      className="border-border bg-secondary/40 mt-6 flex cursor-not-allowed flex-col gap-1 rounded-sm border px-3 py-3"
    >
      <div className="text-muted-foreground flex items-center gap-2 text-xs font-semibold tracking-[0.1em] uppercase">
        <Zap aria-hidden className="size-3.5" />
        PowerDrops
      </div>
      <p className="text-muted-foreground text-xs leading-relaxed">
        Daily regulation tools — coming soon.
      </p>
    </div>
  );
}

function FooterLinks() {
  return (
    <Stack gap="3xs">
      <NextLink
        href="/contact"
        className="interaction-colors interaction-focus text-muted-foreground hover:bg-foreground/5 hover:text-foreground flex items-center gap-3 rounded-sm px-3 py-2 text-sm"
      >
        <HelpCircle aria-hidden className="size-4 shrink-0" />
        Help &amp; Support
      </NextLink>
      <SignOutButton redirectUrl="/">
        <button
          type="button"
          className="interaction-colors interaction-focus text-muted-foreground hover:bg-foreground/5 hover:text-foreground flex w-full items-center gap-3 rounded-sm px-3 py-2 text-left text-sm"
        >
          <LogOut aria-hidden className="size-4 shrink-0" />
          Log Out
        </button>
      </SignOutButton>
    </Stack>
  );
}

/** Persistent left sidebar for large screens. */
export function DashboardSidebar() {
  const pathname = usePathname();

  return (
    <aside className="dark bg-background text-foreground border-border hidden h-full w-64 shrink-0 flex-col border-r lg:flex">
      <div className="border-border border-b px-5 py-6">
        <NextLink href="/dashboard" className="interaction-focus flex flex-col gap-1">
          <span className="font-heading text-xs leading-tight font-semibold tracking-[0.15em] uppercase">
            The Nervous
            <br />
            System Institute
          </span>
          <span className="text-muted-foreground text-[0.65rem] font-medium tracking-[0.3em] uppercase">
            Academy
          </span>
        </NextLink>
      </div>

      <nav aria-label="Academy" className="flex-1 overflow-y-auto px-3 py-4">
        <Stack gap="3xs">
          {navItems.map((item) =>
            item.href ? (
              <NextLink
                key={item.label}
                href={item.href}
                aria-current={isActive(pathname, item.href) ? 'page' : undefined}
                className={linkClass(isActive(pathname, item.href))}
              >
                <NavRowContent item={item} />
              </NextLink>
            ) : (
              <div key={item.label} aria-disabled="true" className={disabledClass}>
                <NavRowContent item={item} />
              </div>
            ),
          )}
        </Stack>
        <PowerDropsCallout />
      </nav>

      <div className="border-border border-t px-3 py-4">
        <FooterLinks />
      </div>
    </aside>
  );
}

/** Hamburger + drawer equivalent for small screens, rendered in the topbar. */
export function DashboardMobileNav() {
  const pathname = usePathname();

  return (
    <DrawerRoot>
      <DrawerTrigger
        render={
          <IconButton
            aria-label="Open Academy menu"
            icon={<Menu className="size-5" />}
            variant="ghost"
            className="lg:hidden"
          />
        }
      />
      <DrawerContent title="Academy" side="left">
        <nav aria-label="Academy">
          <Stack gap="3xs">
            {navItems.map((item) =>
              item.href ? (
                <DrawerClose
                  key={item.label}
                  nativeButton={false}
                  render={
                    <NextLink
                      href={item.href}
                      aria-current={isActive(pathname, item.href) ? 'page' : undefined}
                      className={linkClass(isActive(pathname, item.href))}
                    >
                      <NavRowContent item={item} />
                    </NextLink>
                  }
                />
              ) : (
                <div key={item.label} aria-disabled="true" className={disabledClass}>
                  <NavRowContent item={item} />
                </div>
              ),
            )}
          </Stack>
          <PowerDropsCallout />
          <div className="border-border mt-6 border-t pt-4">
            <FooterLinks />
          </div>
        </nav>
      </DrawerContent>
    </DrawerRoot>
  );
}
