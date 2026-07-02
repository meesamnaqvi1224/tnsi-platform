import NextLink from 'next/link';
import { buttonVariants, Container, Stack, Text } from '@tnsi/ui';
import { executiveAdvisoryContent } from '@/content/executive-advisory';

const { hero } = executiveAdvisoryContent;

export function EaHero() {
  return (
    <section aria-labelledby="ea-hero-heading" className="border-border border-b">
      {/* Full-width editorial photography */}
      <div className="bg-foreground relative min-h-[72vh] w-full">
        <div className="absolute inset-0 flex items-center justify-center">
          <Text size="sm" className="text-background/50 max-w-[16rem] text-center">
            Executive meeting photography placeholder — private strategy session, natural light
          </Text>
        </div>
        <span className="sr-only">{hero.imageAlt}</span>
      </div>

      {/* Editorial content block — stacked below image, not side-by-side */}
      <Container size="xl" className="px-(--space-xl) py-(--space-4xl) sm:px-(--space-2xl)">
        <Stack gap="2xl" className="max-w-4xl">
          <div className="flex flex-col gap-(--space-sm)">
            <span className="text-muted-foreground font-mono text-xs tracking-[0.2em] uppercase">
              Chapter {hero.chapter}
            </span>
            <p className="text-muted-foreground text-xs tracking-[0.15em] uppercase">
              {hero.eyebrow}
            </p>
          </div>

          <h1
            id="ea-hero-heading"
            className="font-heading text-foreground text-4xl leading-[1.02] font-semibold tracking-tight sm:text-5xl lg:text-[4.5rem] xl:text-[5.5rem]"
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

      {/* Premium metadata strip — inverted for executive distinction */}
      <div className="bg-foreground text-background border-border border-t">
        <Container size="xl" className="px-(--space-xl) py-(--space-xl) sm:px-(--space-2xl)">
          <dl className="grid grid-cols-1 gap-(--space-xl) sm:grid-cols-3">
            {hero.metadata.map(({ label, value }) => (
              <div key={label} className="flex flex-col gap-(--space-sm)">
                <dt className="text-background/50 font-mono text-[0.625rem] tracking-[0.2em] uppercase">
                  {label}
                </dt>
                <dd className="font-heading text-lg font-medium tracking-tight">{value}</dd>
              </div>
            ))}
          </dl>
        </Container>
      </div>
    </section>
  );
}
