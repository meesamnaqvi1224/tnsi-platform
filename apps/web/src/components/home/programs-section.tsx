import type * as React from 'react';
import NextLink from 'next/link';
import { ArrowRight } from 'lucide-react';
import { Container, Eyebrow, Grid, Heading, Link, Section, Stack, Text } from '@tnsi/ui';

const programs = [
  {
    title: 'Life Beyond Trauma',
    description:
      'A foundational program for ambitious women ready to rebuild their relationship with their nervous system and reclaim sustainable capacity.',
    href: '/method',
  },
  {
    title: 'Practitioner Certification',
    description:
      'Advanced certification for therapists, coaches and healthcare professionals integrating nervous system science into their practice.',
    href: '/programs/practitioner-certification',
  },
  {
    title: 'Executive Advisory',
    description:
      'Private advisory for senior leaders and executives navigating high-performance environments without physiological cost.',
    href: '/programs/executive-advisory',
  },
] as const;

function ProgramCard({ title, description, href }: (typeof programs)[number]) {
  return (
    <article className="group">
      <NextLink href={href} className="block">
        {/* TODO: swap for the approved program-specific lifestyle image once added to apps/web/public */}
        <div className="border-border bg-secondary relative aspect-[4/3] w-full overflow-hidden rounded-lg border">
          <div className="duration-slow ease-standard absolute inset-0 flex items-center justify-center transition-transform group-hover:scale-105">
            <Text size="sm" tone="muted">
              Image placeholder
            </Text>
          </div>
        </div>
      </NextLink>
      <Stack gap="xs" className="mt-(--space-md)">
        <Text weight="semibold">{title}</Text>
        <Text size="sm" tone="muted">
          {description}
        </Text>
        <Link
          as={
            NextLink as unknown as React.ComponentType<
              React.AnchorHTMLAttributes<HTMLAnchorElement>
            >
          }
          href={href}
          className="inline-flex items-center gap-1"
        >
          Learn More
          <ArrowRight
            aria-hidden
            className="duration-base ease-standard size-4 transition-transform group-hover:translate-x-1"
          />
        </Link>
      </Stack>
    </article>
  );
}

export function ProgramsSection() {
  return (
    <Section spacing="lg" aria-labelledby="programs-heading">
      <Container size="xl">
        <Stack
          direction="row"
          justify="between"
          align="end"
          wrap="wrap"
          gap="sm"
          className="mb-(--space-2xl)"
        >
          <Stack gap="sm" className="max-w-2xl">
            <Eyebrow>Programs</Eyebrow>
            <Heading as="h2" id="programs-heading" size="xl">
              Structured for transformation at every stage.
            </Heading>
          </Stack>
          <Link
            as={
              NextLink as unknown as React.ComponentType<
                React.AnchorHTMLAttributes<HTMLAnchorElement>
              >
            }
            href="/programs"
            className="shrink-0 font-medium"
          >
            View All Programs
          </Link>
        </Stack>

        <Grid cols="3" gap="xl">
          {programs.map((program) => (
            <ProgramCard key={program.href} {...program} />
          ))}
        </Grid>
      </Container>
    </Section>
  );
}
