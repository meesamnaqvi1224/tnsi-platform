import type * as React from 'react';
import NextLink from 'next/link';
import { Eyebrow, Heading, Link, Stack, Text } from '@tnsi/ui';

export function MethodPanel() {
  return (
    <section
      aria-labelledby="method-heading"
      className="grid min-w-0 grid-cols-1 overflow-hidden lg:grid-cols-2"
    >
      {/* `dark` flips the semantic tokens locally to Deep Slate background / cream foreground,
          per docs/02-brand-strategy.md — not a hardcoded navy. */}
      <div className="dark bg-background text-foreground flex items-center px-(--space-lg) py-(--space-3xl) sm:px-(--space-2xl) lg:px-(--space-3xl)">
        <Stack gap="md" className="max-w-md">
          <Eyebrow className="text-muted-foreground">The Method</Eyebrow>
          <Heading as="h2" id="method-heading" size="xl" className="text-3xl sm:text-4xl">
            Life Beyond Trauma
          </Heading>
          <Text tone="muted">
            A proprietary methodology developed over fifteen years of clinical practice and
            research. Integrating polyvagal theory, attachment science, and somatic approaches into
            a coherent educational framework for lasting transformation.
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
      </div>

      {/* TODO: swap for the approved teacup/notebook still-life asset once added to apps/web/public */}
      <div className="border-border bg-secondary relative aspect-[4/3] w-full border lg:aspect-auto">
        <div className="absolute inset-0 flex items-center justify-center">
          <Text size="sm" tone="muted">
            Still-life placeholder
          </Text>
        </div>
      </div>
    </section>
  );
}
