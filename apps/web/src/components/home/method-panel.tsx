import type * as React from 'react';
import NextLink from 'next/link';
import { Eyebrow, Heading, Link, Stack, Text } from '@tnsi/ui';
import { EditorialImage } from '@/components/utility/editorial-image';
import { homeImages } from '@/content/images';

export function MethodPanel() {
  return (
    <section
      aria-labelledby="method-heading"
      className="grid min-w-0 grid-cols-1 overflow-hidden lg:grid-cols-2"
    >
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

      <EditorialImage
        src={homeImages.methodPanel}
        alt="Caroline Reed in a warm editorial portrait within a modern office setting."
        aspect="landscape"
        className="border-border border lg:aspect-auto lg:min-h-full lg:rounded-none"
        sizes="(max-width: 1024px) 100vw, 50vw"
      />
    </section>
  );
}
