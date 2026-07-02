import NextLink from 'next/link';
import { buttonVariants, Container, Stack, Text } from '@tnsi/ui';
import { practitionerCertificationContent } from '@/content/practitioner-certification';

const { hero } = practitionerCertificationContent;

export function PcHero() {
  return (
    <section
      aria-labelledby="pc-hero-heading"
      className="border-border grid min-h-[90vh] grid-cols-1 border-b lg:grid-cols-[52fr_48fr]"
    >
      <div className="flex flex-col justify-end px-(--space-xl) pt-(--space-5xl) pb-(--space-4xl) sm:px-(--space-3xl) lg:px-(--space-3xl)">
        <Stack gap="xl" className="max-w-xl">
          <div className="flex flex-col gap-(--space-sm)">
            <div className="flex items-center gap-(--space-md)">
              <span className="text-muted-foreground shrink-0 font-mono text-xs tracking-[0.2em] uppercase">
                Chapter {hero.chapter}
              </span>
              <div className="border-border flex-1 border-t" aria-hidden />
            </div>
            <p className="text-muted-foreground text-xs tracking-[0.15em] uppercase">
              {hero.eyebrow}
            </p>
          </div>

          <h1
            id="pc-hero-heading"
            className="font-heading text-foreground text-5xl leading-[1.02] font-semibold tracking-tight lg:text-[4.5rem] xl:text-[5.5rem]"
          >
            {hero.headline}
          </h1>

          <Stack gap="lg">
            <p className="text-foreground max-w-2xl text-xl leading-snug font-medium lg:text-2xl">
              {hero.supportingHeadline}
            </p>
            <Text tone="muted" className="max-w-prose leading-relaxed">
              {hero.supportingCopy}
            </Text>
          </Stack>

          <dl className="border-border grid grid-cols-3 gap-(--space-md) border-y py-(--space-lg)">
            {hero.metadata.map(({ label, value }) => (
              <div key={label} className="flex flex-col gap-(--space-2xs)">
                <dt className="text-muted-foreground font-mono text-[0.625rem] tracking-[0.15em] uppercase">
                  {label}
                </dt>
                <dd className="text-foreground text-sm font-medium">{value}</dd>
              </div>
            ))}
          </dl>

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
      </div>

      <div className="bg-secondary relative min-h-[50vh] lg:min-h-0">
        <div className="absolute inset-0 flex items-center justify-center">
          <Text size="sm" tone="muted" className="max-w-[14rem] text-center">
            Workshop photography placeholder — Caroline teaching practitioners
          </Text>
        </div>
        <Container size="xl" className="absolute right-0 bottom-0 left-0 p-(--space-lg)">
          <figcaption className="border-border border-t pt-(--space-sm)">
            <p className="text-muted-foreground text-xs leading-relaxed">
              <span className="font-mono">Figure 1.</span> {hero.imageCaption}
            </p>
          </figcaption>
        </Container>
      </div>
    </section>
  );
}
