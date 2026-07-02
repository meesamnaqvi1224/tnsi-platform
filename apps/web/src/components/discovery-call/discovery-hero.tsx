import { ResponsiveImage } from '@/components/utility/responsive-image';
import NextLink from 'next/link';
import { buttonVariants, Container, Stack, Text } from '@tnsi/ui';
import { discoveryCallContent } from '@/content/discovery-call';

const { hero } = discoveryCallContent;

export function DiscoveryHero() {
  return (
    <section
      aria-labelledby="discovery-hero-heading"
      className="border-border border-b bg-[color-mix(in_oklch,var(--secondary)_18%,var(--background))]"
    >
      <div className="relative min-h-[52vh] w-full overflow-hidden lg:min-h-[60vh]">
        <ResponsiveImage
          src={hero.imageSrc}
          alt={hero.imageAlt}
          fill
          priority
          className="object-cover"
          sizes="100vw"
        />
        <div
          aria-hidden
          className="absolute inset-0 bg-[linear-gradient(to_bottom,color-mix(in_oklch,var(--background)_25%,transparent)_0%,color-mix(in_oklch,var(--background)_88%,transparent)_100%)]"
        />
      </div>

      <Container
        size="xl"
        className="px-(--space-xl) py-(--space-5xl) sm:px-(--space-2xl) lg:py-(--space-6xl)"
      >
        <Stack gap="3xl" className="mx-auto max-w-3xl text-center">
          <div className="flex flex-col items-center gap-(--space-sm)">
            <span className="text-muted-foreground font-mono text-xs tracking-[0.2em] uppercase">
              Chapter {hero.chapter}
            </span>
            <p className="text-muted-foreground text-xs tracking-[0.15em] uppercase">
              {hero.eyebrow}
            </p>
          </div>

          <h1
            id="discovery-hero-heading"
            className="font-heading text-foreground text-4xl leading-[1.02] font-semibold tracking-tight sm:text-5xl lg:text-[4.5rem] xl:text-[5.5rem]"
          >
            {hero.headline}
          </h1>

          <Stack gap="lg" className="items-center">
            <p className="text-foreground text-lg leading-snug font-medium sm:text-xl lg:text-2xl">
              {hero.supportingHeadline}
            </p>
            <Text tone="muted" className="max-w-prose leading-relaxed">
              {hero.supportingCopy}
            </Text>
          </Stack>

          <Stack direction="row" gap="sm" wrap="wrap" className="justify-center">
            <NextLink
              href={hero.primaryCta.href}
              className={buttonVariants({ variant: 'primary', size: 'lg' })}
            >
              {hero.primaryCta.label}
            </NextLink>
            <NextLink href={hero.secondaryCta.href} className="interaction-text-link-underline">
              {hero.secondaryCta.label}
            </NextLink>
          </Stack>
        </Stack>
      </Container>
    </section>
  );
}
