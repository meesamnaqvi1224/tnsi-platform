import type * as React from 'react';
import NextLink from 'next/link';
import { ArrowRight } from 'lucide-react';
import { Container, Eyebrow, Grid, Heading, Link, Section, Stack, Text } from '@tnsi/ui';
import { FadeIn } from '@/components/utility/fade-in';
import { ResponsiveImage } from '@/components/utility/responsive-image';

const programs = [
  {
    title: 'Life Beyond Trauma',
    description:
      'A foundational pathway for individuals ready to rebuild their relationship with their nervous system and reclaim sustainable capacity.',
    href: '/programs/life-beyond-trauma',
    imageSrc: '/images/home/program-life-beyond-trauma.webp',
    imageAlt: 'A woman reading calmly in a sunlit chair beside a garden window.',
  },
  {
    title: 'Practitioner Certification',
    description:
      'Advanced certification for therapists, coaches and healthcare professionals integrating nervous system science into their practice.',
    href: '/programs/practitioner-certification',
    imageSrc: '/images/home/program-practitioner.webp',
    imageAlt: 'Women learning together around an oak table in a bright, plant-filled studio.',
  },
  {
    title: 'Executive Advisory',
    description:
      'Private advisory for senior leaders and executives navigating high-performance environments without physiological cost.',
    href: '/programs/executive-advisory',
    imageSrc: '/images/home/program-executive.webp',
    imageAlt:
      'Two women in focused conversation across a table in a calm, glass-walled meeting space.',
  },
] as const;

function ProgramCard({ title, description, href, imageSrc, imageAlt }: (typeof programs)[number]) {
  return (
    <article className="group">
      <NextLink href={href} className="interaction-focus block rounded-lg">
        <figure className="border-border bg-secondary relative aspect-[3/4] w-full overflow-hidden rounded-lg border">
          <ResponsiveImage
            src={imageSrc}
            alt={imageAlt}
            fill
            className="interaction-transform object-cover duration-700 ease-out group-hover:scale-[1.03]"
            sizes="(max-width: 768px) 100vw, 33vw"
          />
        </figure>
      </NextLink>
      <Stack gap="xs" className="mt-(--space-lg)">
        <Text
          weight="semibold"
          className="interaction-transform duration-slow ease-standard group-hover:-translate-y-1"
        >
          {title}
        </Text>
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
          className="mt-(--space-xs) inline-flex items-center gap-1"
        >
          Learn More
          <ArrowRight aria-hidden className="interaction-arrow" />
        </Link>
      </Stack>
    </article>
  );
}

export function ProgramsSection() {
  return (
    <Section spacing="xl" aria-labelledby="programs-heading">
      <Container size="xl">
        <FadeIn>
          <Stack
            direction="row"
            justify="between"
            align="end"
            wrap="wrap"
            gap="sm"
            className="mb-(--space-3xl)"
          >
            <Stack gap="sm" className="max-w-2xl">
              <Eyebrow>Programs</Eyebrow>
              <Heading as="h2" id="programs-heading" size="xl" className="text-3xl sm:text-4xl">
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
        </FadeIn>

        <Grid cols="3" gap="xl">
          {programs.map((program, index) => (
            <FadeIn key={program.href} delayMs={index * 80}>
              <ProgramCard {...program} />
            </FadeIn>
          ))}
        </Grid>
      </Container>
    </Section>
  );
}
