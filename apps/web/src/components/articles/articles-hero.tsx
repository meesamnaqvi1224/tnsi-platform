import NextLink from 'next/link';
import { buttonVariants, Container, Stack, Text } from '@tnsi/ui';
import { articlesContent } from '@/content/articles';

const { hero } = articlesContent;

export function ArticlesHero() {
  return (
    <section
      aria-labelledby="articles-hero-heading"
      className="border-border relative flex min-h-[85vh] items-end overflow-hidden border-b"
    >
      <div className="bg-secondary absolute inset-0" aria-hidden>
        <div className="flex h-full items-center justify-center">
          <Text size="sm" tone="muted" className="max-w-[16rem] text-center">
            Editorial photography — notebook, books, writing desk
          </Text>
        </div>
      </div>

      <div
        aria-hidden
        className="absolute inset-0 bg-[linear-gradient(to_top,color-mix(in_oklch,var(--background)_88%,transparent)_0%,color-mix(in_oklch,var(--background)_35%,transparent)_60%,transparent_100%)]"
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
            id="articles-hero-heading"
            className="font-heading text-foreground text-4xl leading-[0.98] font-semibold tracking-tight sm:text-5xl md:text-6xl lg:text-[5.5rem] xl:text-[6.5rem]"
          >
            {hero.headline}
          </h1>

          <Stack gap="lg">
            <p className="text-foreground max-w-2xl text-lg leading-snug font-medium sm:text-xl lg:text-2xl">
              {hero.supportingHeadline}
            </p>
            <Text tone="muted" className="max-w-prose leading-relaxed">
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
