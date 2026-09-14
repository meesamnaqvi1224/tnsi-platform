import type * as React from 'react';
import NextLink from 'next/link';
import { Container, Eyebrow, Heading, Link, Section, Stack, Text } from '@tnsi/ui';
import { aboutContent } from '@/content/about';

const { theoryTeaser } = aboutContent;

export function TheoryTeaser() {
  return (
    <Section
      spacing="xl"
      className="border-border bg-secondary border-t"
      aria-labelledby="theory-teaser-heading"
    >
      <Container size="md">
        <Stack gap="lg" align="center" className="text-center">
          <Eyebrow>{theoryTeaser.eyebrow}</Eyebrow>
          <Heading as="h2" id="theory-teaser-heading" size="xl">
            {theoryTeaser.headline}
          </Heading>
          <Stack gap="sm" align="center">
            {theoryTeaser.paragraphs.map((paragraph) => (
              <Text key={paragraph} tone="muted" className="max-w-prose leading-relaxed">
                {paragraph}
              </Text>
            ))}
          </Stack>
          <div>
            <Link
              as={
                NextLink as unknown as React.ComponentType<
                  React.AnchorHTMLAttributes<HTMLAnchorElement>
                >
              }
              href={theoryTeaser.cta.href}
              className="font-medium"
            >
              {theoryTeaser.cta.label} →
            </Link>
          </div>
        </Stack>
      </Container>
    </Section>
  );
}
