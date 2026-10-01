import NextLink from 'next/link';
import { buttonVariants, Container, Stack, Text } from '@tnsi/ui';
import { FadeIn } from '@/components/utility/fade-in';
import { ResponsiveImage } from '@/components/utility/responsive-image';
import { practitionerCertificationContent } from '@/content/practitioner-certification';

const { hero } = practitionerCertificationContent;

export function PcHero() {
  return (
    <section
      aria-labelledby="pc-hero-heading"
      className="border-foreground/15 grid min-h-[90vh] grid-cols-1 border-b lg:grid-cols-[52fr_48fr]"
    >
      <div className="flex flex-col justify-end px-(--space-xl) pt-(--space-5xl) pb-(--space-4xl) sm:px-(--space-3xl) lg:px-(--space-3xl)">
        <Stack gap="xl" className="max-w-xl">
          <FadeIn>
            <div className="flex flex-col gap-(--space-sm)">
              <div className="border-foreground/15 border-t" aria-hidden />
              <p className="text-muted-foreground font-mono text-xs tracking-[0.25em] uppercase">
                {hero.eyebrow}
              </p>
            </div>
          </FadeIn>

          <FadeIn delayMs={80}>
            <h1
              id="pc-hero-heading"
              className="font-heading text-foreground text-[2.75rem] leading-[1.02] font-semibold tracking-tight sm:text-6xl lg:text-[4.75rem] xl:text-[5.75rem]"
            >
              {hero.headline}
            </h1>
          </FadeIn>

          <FadeIn delayMs={160}>
            <Stack gap="lg">
              <p className="text-foreground max-w-2xl text-lg leading-snug font-medium sm:text-xl lg:text-2xl">
                {hero.supportingHeadline}
              </p>
              <Text tone="muted" className="max-w-prose leading-relaxed">
                {hero.supportingCopy}
              </Text>
            </Stack>
          </FadeIn>

          <FadeIn delayMs={220}>
            <dl className="border-foreground/15 grid grid-cols-1 gap-(--space-md) border-y py-(--space-lg) sm:grid-cols-3">
              {hero.metadata.map(({ label, value }) => (
                <div key={label} className="flex flex-col gap-(--space-2xs)">
                  <dt className="text-muted-foreground font-mono text-[0.625rem] tracking-[0.15em] uppercase">
                    {label}
                  </dt>
                  <dd className="text-foreground text-sm font-medium">{value}</dd>
                </div>
              ))}
            </dl>
          </FadeIn>

          <FadeIn delayMs={260}>
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
          </FadeIn>
        </Stack>
      </div>

      <figure className="bg-secondary relative min-h-[50vh] overflow-hidden lg:min-h-0">
        <ResponsiveImage
          src={hero.imageSrc}
          alt={hero.imageAlt}
          fill
          priority
          className="object-cover"
          sizes="(max-width: 1024px) 100vw, 48vw"
        />
        <Container size="xl" className="absolute right-0 bottom-0 left-0 p-(--space-lg)">
          <figcaption className="border-foreground/15 border-t pt-(--space-sm)">
            <p className="text-muted-foreground text-xs leading-relaxed">
              <span className="font-mono">Figure 1.</span> {hero.imageCaption}
            </p>
          </figcaption>
        </Container>
      </figure>
    </section>
  );
}
