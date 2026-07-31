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
            <Eyebrow className="text-muted-foreground">The Method</Eyebrow>
            <Heading as="h2" id="method-heading" size="xl" className="text-3xl sm:text-4xl">
              Life Beyond Trauma
            </Heading>
            <Text tone="muted">
              A proprietary methodology developed over fifteen years of clinical practice and
              research. Integrating polyvagal theory, attachment science, and somatic approaches
              into a coherent educational framework for lasting transformation.
            </Text>
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
              Learn the Method
            </Link>
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
