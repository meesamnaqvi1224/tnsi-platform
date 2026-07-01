import NextLink from 'next/link';
import { buttonVariants, Container, Stack, Text } from '@tnsi/ui';
import { researchContent } from '@/content/research';

const { hero } = researchContent;

export function ResearchHero() {
  return (
    <section
      aria-labelledby="research-hero-heading"
      className="border-border relative flex min-h-[80vh] items-end overflow-hidden border-b"
    >
      <div className="bg-secondary absolute inset-0" aria-hidden>
        <div className="flex h-full items-center justify-center">
          <Text size="sm" tone="muted" className="max-w-[18rem] text-center">
            Research photography — papers, journals, notebook, natural daylight
          </Text>
        </div>
      </div>

      <div
        aria-hidden
        className="absolute inset-0 bg-[linear-gradient(to_top,color-mix(in_oklch,var(--background)_90%,transparent)_0%,transparent_70%)]"
      />

      <Container
        size="xl"
        className="relative z-10 px-(--space-xl) pt-(--space-4xl) pb-(--space-5xl) sm:px-(--space-2xl)"
      >
        <Stack gap="2xl" className="max-w-3xl">
          <div className="flex flex-col gap-(--space-sm)">
            <span className="text-muted-foreground font-mono text-xs tracking-[0.2em] uppercase">
              Chapter {hero.chapter}
            </span>
            <p className="text-muted-foreground text-xs tracking-[0.15em] uppercase">
              {hero.eyebrow}
            </p>
          </div>

          <h1
            id="research-hero-heading"
            className="font-heading text-foreground text-6xl leading-[0.98] font-semibold tracking-tight lg:text-[5rem] xl:text-[6rem]"
          >
            {hero.headline}
          </h1>

          <Stack gap="lg">
            <p className="text-foreground max-w-2xl text-xl leading-snug font-medium lg:text-2xl">
              {hero.supportingHeadline}
            </p>
            <Text tone="muted" className="max-w-prose text-base leading-relaxed">
              {hero.supportingCopy}
            </Text>
          </Stack>

          <Stack direction="row" gap="sm" wrap="wrap">
            <NextLink
              href={hero.primaryCta.href}
              className={buttonVariants({ variant: 'primary', size: 'lg' })}
            >
              {hero.primaryCta.label}
            </NextLink>
            <NextLink
              href={hero.secondaryCta.href}
              className={buttonVariants({ variant: 'outline', size: 'lg' })}
            >
              {hero.secondaryCta.label}
            </NextLink>
          </Stack>
        </Stack>
      </Container>

      <span className="sr-only">{hero.imageAlt}</span>
    </section>
  );
}
