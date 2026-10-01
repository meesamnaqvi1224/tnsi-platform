import NextLink from 'next/link';
import { buttonVariants, Container, Stack, Text } from '@tnsi/ui';
import { ResponsiveImage } from '@/components/utility/responsive-image';
import { executiveAdvisoryContent } from '@/content/executive-advisory';

const { hero } = executiveAdvisoryContent;

/**
 * One immersive composition rather than image-then-text-block: the
 * photograph fills the viewport and the headline sits directly over it,
 * bottom-anchored like a magazine cover. A quiet bottom-to-transparent
 * scrim (the same neutral-black treatment already used for `MethodQuote`
 * and `EditorialPause`, not a new colour) keeps the type legible without
 * dimming the photograph as a whole. The slow one-time scale-in on the
 * image is pure CSS (`hero-ken-burns` in globals.css) — no JS, and already
 * covered by the site-wide `prefers-reduced-motion` neutralisation.
 */
export function EaHero() {
  return (
    <section aria-labelledby="ea-hero-heading" className="relative min-h-[92vh] overflow-hidden">
      <div className="animate-hero-ken-burns absolute inset-0">
        <ResponsiveImage
          src={hero.imageSrc}
          alt={hero.imageAlt}
          fill
          priority
          className="object-cover"
          sizes="100vw"
        />
      </div>
      <div
        className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent"
        aria-hidden
      />

      <Container
        size="xl"
        className="dark text-foreground relative flex min-h-[92vh] flex-col justify-end px-(--space-xl) pt-(--space-5xl) pb-(--space-3xl) sm:px-(--space-2xl) sm:pb-(--space-4xl)"
      >
        <Stack gap="xl" className="max-w-4xl">
          <h1
            id="ea-hero-heading"
            className="font-heading text-[2.75rem] leading-[1] font-semibold tracking-tight text-white sm:text-6xl lg:text-[5.5rem] xl:text-[6.5rem]"
          >
            {hero.headline}
          </h1>

          <p className="max-w-xl text-lg leading-snug font-medium text-white/90 sm:text-xl">
            {hero.supportingHeadline}
          </p>

          <Text className="max-w-xl text-base leading-relaxed text-white/70">
            {hero.supportingCopy}
          </Text>

          <Stack direction="row" gap="sm" wrap="wrap" className="pt-(--space-sm)">
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

          <dl className="flex flex-wrap gap-x-(--space-2xl) gap-y-(--space-sm) pt-(--space-lg)">
            {hero.metadata.map(({ label, value }) => (
              <div key={label} className="flex flex-col gap-(--space-3xs)">
                <dt className="font-mono text-[0.625rem] tracking-[0.2em] text-white/50 uppercase">
                  {label}
                </dt>
                <dd className="text-sm font-medium text-white/85">{value}</dd>
              </div>
            ))}
          </dl>
        </Stack>
      </Container>
    </section>
  );
}
