import type * as React from 'react';
import NextLink from 'next/link';
import { Eyebrow, Heading, Link, Stack, Text } from '@tnsi/ui';
import { FadeIn } from '@/components/utility/fade-in';
import { ResponsiveImage } from '@/components/utility/responsive-image';

export function MethodPanel() {
  return (
    <section
      aria-labelledby="method-heading"
      className="grid min-w-0 grid-cols-1 overflow-hidden lg:grid-cols-5"
    >
      {/* `dark` flips the semantic tokens locally to Deep Slate background / cream foreground,
          per docs/02-brand-strategy.md — not a hardcoded navy. 40% of the panel on desktop. */}
      <div className="dark bg-background text-foreground flex items-center px-(--space-lg) py-(--space-4xl) sm:px-(--space-2xl) lg:col-span-2 lg:px-(--space-3xl) lg:py-(--space-5xl)">
        <FadeIn>
          <Stack gap="md" className="max-w-md">
            <Eyebrow className="text-muted-foreground">Our Approach</Eyebrow>
            <Heading as="h2" id="method-heading" size="xl" className="text-3xl sm:text-4xl">
              Human Expansion Theory™
            </Heading>
            <Text tone="muted">
              The Human Expansion Theory™ is the conceptual foundation of The Nervous System
              Institute. It explores how the conditions surrounding an individual influence their
              capacity to grow, adapt, and participate throughout life.
            </Text>
            <Text tone="muted">
              Life Beyond Trauma™ is the Institute&apos;s flagship educational pathway built on this
              foundation — one of several pathways that each apply the theory within a different
              context.
            </Text>
            <Stack direction="row" gap="md" wrap="wrap">
              <Link
                as={
                  NextLink as unknown as React.ComponentType<
                    React.AnchorHTMLAttributes<HTMLAnchorElement>
                  >
                }
                href="/method"
                tone="inherit"
                className="font-medium"
              >
                Explore Human Expansion Theory™
              </Link>
              <Link
                as={
                  NextLink as unknown as React.ComponentType<
                    React.AnchorHTMLAttributes<HTMLAnchorElement>
                  >
                }
                href="/programs/life-beyond-trauma"
                tone="inherit"
                className="font-medium"
              >
                Explore Life Beyond Trauma
              </Link>
            </Stack>
          </Stack>
        </FadeIn>
      </div>

      {/* 60% of the panel on desktop — photography is the hero here. */}
      <figure className="border-border bg-secondary relative aspect-[4/3] w-full overflow-hidden border lg:col-span-3 lg:aspect-auto lg:min-h-[36rem]">
        <ResponsiveImage
          src="/images/home/method-stilllife.webp"
          alt="A still-life of a ceramic tea set, an open notebook and books on a linen-draped table in warm natural light."
          fill
          className="object-cover"
          sizes="(max-width: 1024px) 100vw, 60vw"
        />
      </figure>
    </section>
  );
}
