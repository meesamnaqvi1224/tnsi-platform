import type * as React from 'react';
import NextLink from 'next/link';
import { Eyebrow, Heading, Link, Stack, Text } from '@tnsi/ui';
import { EditorialImage } from '@/components/utility/editorial-image';
import { aboutImages } from '@/content/images';
import { aboutContent } from '@/content/about';

const { founder } = aboutContent;

export function FounderSection() {
  return (
    <section aria-labelledby="founder-heading" className="grid grid-cols-1 lg:grid-cols-2">
      <EditorialImage
        src={aboutImages.founderPortrait}
        alt="Black and white portrait of Caroline Reed seated in a leather chair, wearing glasses and smiling warmly."
        aspect="portrait"
        className="border-border border lg:aspect-auto lg:min-h-full lg:rounded-none"
        sizes="(max-width: 1024px) 100vw, 50vw"
      />

      <div className="dark bg-background text-foreground flex items-center px-[var(--space-lg)] py-[var(--space-3xl)] sm:px-[var(--space-2xl)] lg:px-[var(--space-3xl)]">
        <Stack gap="md" className="max-w-md">
          <Eyebrow className="text-muted-foreground">{founder.eyebrow}</Eyebrow>
          <Heading as="h2" id="founder-heading" size="xl">
            {founder.name}
          </Heading>
          <Text size="sm" tone="muted" className="font-medium">
            {founder.title}
            <br />
            {founder.subtitle}
          </Text>
          {founder.paragraphs.map((paragraph) => (
            <Text key={paragraph} tone="muted">
              {paragraph}
            </Text>
          ))}
          <div>
            <Link
              as={
                NextLink as unknown as React.ComponentType<
                  React.AnchorHTMLAttributes<HTMLAnchorElement>
                >
              }
              href={founder.cta.href}
              tone="inherit"
              className="font-medium"
            >
              {founder.cta.label} →
            </Link>
          </div>
        </Stack>
      </div>
    </section>
  );
}
