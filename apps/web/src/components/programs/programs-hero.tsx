import NextLink from 'next/link';
import { buttonVariants, Eyebrow, Stack, Text } from '@tnsi/ui';
import { SectionImage } from '@/components/utility/section-image';
import { programsOverviewContent } from '@/content/programs';

const { hero } = programsOverviewContent;

export function ProgramsHero() {
  return (
    <section
      aria-labelledby="programs-hero-heading"
      className="relative flex min-h-screen items-center justify-center overflow-hidden"
    >
      {/* Full-bleed background image */}
      <SectionImage src={hero.imageSrc} alt={hero.imageAlt} priority sizes="100vw" />

      {/* Light scrim for legibility — no dark panel */}
      <div
        aria-hidden
        className="absolute inset-0 bg-[color-mix(in_oklch,var(--background)_72%,transparent)]"
      />

      {/* Centred editorial content */}
      <div className="relative z-10 px-(--space-xl) py-(--space-4xl) text-center sm:px-(--space-2xl)">
        <Stack gap="xl" className="mx-auto max-w-2xl items-center">
          <Eyebrow className="text-muted-foreground">{hero.eyebrow}</Eyebrow>

          <h1
            id="programs-hero-heading"
            className="font-heading text-foreground text-4xl leading-[1.02] font-semibold tracking-tight sm:text-5xl lg:text-[4.5rem] xl:text-[5.5rem]"
          >
            {hero.headline}
          </h1>

          <Text size="lg" tone="muted" className="max-w-md">
            {hero.supportingCopy}
          </Text>

          <NextLink
            href={hero.primaryCta.href}
            className={buttonVariants({ variant: 'primary', size: 'lg' })}
          >
            {hero.primaryCta.label}
          </NextLink>
        </Stack>
      </div>
    </section>
  );
}
