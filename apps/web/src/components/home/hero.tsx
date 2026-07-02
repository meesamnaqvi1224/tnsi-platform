import NextLink from 'next/link';
import { buttonVariants, Container, Eyebrow, Heading, Section, Stack, Text } from '@tnsi/ui';

export function Hero() {
  return (
    <Section spacing="xl" aria-labelledby="hero-heading">
      <Container size="xl">
        <div className="grid grid-cols-1 items-center gap-(--space-2xl) lg:grid-cols-5 lg:gap-(--space-3xl)">
          <Stack gap="lg" className="lg:col-span-3">
            <Eyebrow>Nervous System Education</Eyebrow>
            <Heading as="h1" id="hero-heading" size="2xl" className="text-4xl sm:text-5xl">
              Success shouldn&apos;t cost your nervous system.
            </Heading>
            <Text size="lg" tone="muted" className="max-w-prose">
              Evidence-informed education for ambitious women, leaders and practitioners who want
              sustainable success without sacrificing their wellbeing.
            </Text>
            <Stack direction="row" gap="sm" wrap="wrap">
              <NextLink
                href="/about"
                className={buttonVariants({ variant: 'primary', size: 'lg' })}
              >
                Explore the Institute
              </NextLink>
              <NextLink
                href="/book-a-call"
                className={buttonVariants({ variant: 'outline', size: 'lg' })}
              >
                Book a Discovery Call
              </NextLink>
            </Stack>
          </Stack>

          {/* TODO: swap for the approved Caroline Reed portrait asset (red top, leather chair, hero style) once added to apps/web/public */}
          <figure className="border-border bg-secondary relative aspect-[4/5] w-full overflow-hidden rounded-lg border lg:col-span-2">
            <div className="absolute inset-0 flex items-center justify-center" aria-hidden>
              <Text size="sm" tone="muted">
                Portrait placeholder
              </Text>
            </div>
            <figcaption className="absolute bottom-0 left-0 p-(--space-md)">
              <Text size="sm" className="text-foreground">
                Caroline Reed — Founder &amp; Director
              </Text>
            </figcaption>
            <span className="sr-only">
              Editorial portrait of Caroline Reed, Founder and Director of The Nervous System
              Institute.
            </span>
          </figure>
        </div>
      </Container>
    </Section>
  );
}
