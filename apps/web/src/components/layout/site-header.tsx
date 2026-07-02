'use client';

import * as React from 'react';
import NextLink from 'next/link';
import { Menu } from 'lucide-react';
import {
  buttonVariants,
  Container,
  cn,
  DrawerClose,
  DrawerContent,
  DrawerRoot,
  DrawerTrigger,
  IconButton,
  Stack,
} from '@tnsi/ui';
import { primaryNavLinks } from '@/lib/nav-links';

export function SiteHeader() {
  const [isScrolled, setIsScrolled] = React.useState(false);

  React.useEffect(() => {
    const onScroll = () => setIsScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <header
      className={cn(
        'interaction-colors sticky top-0 z-(--z-sticky) w-full border-b',
        isScrolled
          ? 'border-border bg-background/95 backdrop-blur-sm'
          : 'bg-background border-transparent',
      )}
    >
      <Container size="xl" className="flex h-20 items-center justify-between">
        <NextLink
          href="/"
          className="interaction-focus font-heading text-sm leading-tight font-semibold tracking-[0.1em] uppercase"
        >
          The
          <br />
          Nervous System Institute
        </NextLink>

        <nav aria-label="Primary" className="hidden items-center gap-8 lg:flex">
          {primaryNavLinks.map((link) => (
            <NextLink
              key={link.href}
              href={link.href}
              className="interaction-colors interaction-focus text-foreground hover:text-muted-foreground text-sm"
            >
              {link.label}
            </NextLink>
          ))}
        </nav>

        <Stack direction="row" align="center" gap="sm">
          <NextLink
            href="/book-a-call"
            className={buttonVariants({ variant: 'primary', size: 'md' })}
          >
            Book a Call
          </NextLink>

          <DrawerRoot>
            <DrawerTrigger
              render={
                <IconButton
                  aria-label="Open menu"
                  icon={<Menu className="size-5" />}
                  variant="ghost"
                  className="lg:hidden"
                />
              }
            />
            <DrawerContent title="Menu" side="right">
              <nav aria-label="Primary">
                <Stack gap="lg">
                  {primaryNavLinks.map((link) => (
                    <DrawerClose
                      key={link.href}
                      nativeButton={false}
                      render={
                        <NextLink
                          href={link.href}
                          className="interaction-text-link text-foreground text-base"
                        >
                          {link.label}
                        </NextLink>
                      }
                    />
                  ))}
                </Stack>
              </nav>
            </DrawerContent>
          </DrawerRoot>
        </Stack>
      </Container>
    </header>
  );
}
