import NextLink from 'next/link';
import { buttonVariants, Container, Stack, Text } from '@tnsi/ui';
import { ResponsiveImage } from '@/components/utility/responsive-image';
import { ScrollLinked } from '@/components/utility/scroll-linked';
import { humanExpansionTheoryContent } from '@/content/human-expansion-theory';

const { hero } = humanExpansionTheoryContent;

/**
 * Hero — one full-bleed photograph (the two women in conversation) with the
 * existing eyebrow, title, tagline and CTA set over it, bottom-left, like
 * the other pathway heroes. Flat dark scrim sized so the tagline stays ≥ 4.5:1
 * over the brightest part of the photograph. The only motion is a
 * barely-perceptible scroll response: the image eases from 1.00 to 1.03 and
 * the text drifts up ~28px as the page scrolls away (see `ScrollLinked`).
 * Text is in the `dark` token scope, not a hardcoded white.
 */
export function MethodHero() {
  return (
    <section aria-labelledby="method-hero-heading" data-chapter data-tone="dark">
      <ScrollLinked className="relative overflow-hidden">
        <div
          className="absolute inset-0 will-change-transform"
          style={{ transform: 'scale(calc(1 + var(--p) * 0.03))' }}
        >
          <ResponsiveImage
            src="/images/discovery/hero-landscape.webp"
            alt="Two women in conversation across a wooden table in a warm, softly lit room."
            fill
            priority
            className="object-cover object-[30%_50%] lg:object-center"
            sizes="100vw"
          />
        </div>
        <div className="absolute inset-0 bg-black/[0.82]" aria-hidden />

        <Container
          size="xl"
          className="dark text-foreground relative flex min-h-[calc(100svh-5rem)] flex-col justify-end pt-(--space-5xl) pb-(--space-3xl) sm:pb-(--space-4xl)"
        >
          <div
            className="will-change-transform"
            style={{
              transform: 'translateY(calc(var(--p) * -28px))',
              opacity: 'calc(1 - var(--p) * 0.3)',
            }}
          >
            <Stack gap="lg" className="max-w-3xl">
              <p className="font-mono text-xs tracking-[0.25em] text-white uppercase">
                {hero.eyebrow}
              </p>

              <h1
                id="method-hero-heading"
                className="font-heading text-[clamp(3.25rem,6.6vw,5.75rem)] leading-[1.02] font-semibold tracking-tight text-balance text-white"
              >
                {hero.headline}
              </h1>

              <Text size="lg" className="max-w-xl text-lg leading-[1.7] text-white lg:text-xl">
                {hero.tagline}
              </Text>

              <div className="pt-(--space-sm)">
                <NextLink
                  href={hero.cta.href}
                  className={buttonVariants({ variant: 'primary', size: 'lg' })}
                >
                  {hero.cta.label}
                </NextLink>
              </div>
            </Stack>
          </div>
        </Container>
      </ScrollLinked>
    </section>
  );
}
