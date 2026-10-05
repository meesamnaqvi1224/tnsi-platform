import NextLink from 'next/link';
import { buttonVariants, Container, Eyebrow, Stack, Text } from '@tnsi/ui';
import { ResponsiveImage } from '@/components/utility/responsive-image';
import { ScrollLinked } from '@/components/utility/scroll-linked';
import { methodImages } from '@/content/images';
import { humanExpansionTheoryContent } from '@/content/human-expansion-theory';

const { hero } = humanExpansionTheoryContent;

/**
 * Hero — the existing eyebrow, title, tagline and CTA on the left, the
 * existing Caroline portrait as a full-height photograph on the right (it
 * bleeds to the viewport edge on desktop instead of sitting in a small
 * card). The only motion is a barely-perceptible scroll response: the
 * portrait eases from 1.00 to 1.03 and the text drifts up ~28px as the page
 * scrolls away from the hero (see `ScrollLinked`).
 */
export function MethodHero() {
  return (
    <section aria-labelledby="method-hero-heading" data-chapter data-tone="dark">
      <ScrollLinked className="relative lg:min-h-[min(46rem,calc(100svh-5rem))]">
        <Container
          size="xl"
          className="relative z-10 flex items-center py-(--space-4xl) lg:min-h-[inherit] lg:py-(--space-5xl)"
        >
          <div
            className="will-change-transform lg:w-[52%]"
            style={{
              transform: 'translateY(calc(var(--p) * -28px))',
              opacity: 'calc(1 - var(--p) * 0.3)',
            }}
          >
            <Stack gap="lg">
              <Eyebrow>{hero.eyebrow}</Eyebrow>

              <h1
                id="method-hero-heading"
                className="font-heading text-foreground text-[clamp(3.25rem,6.4vw,5.5rem)] leading-[1.02] font-semibold tracking-tight text-balance"
              >
                {hero.headline}
              </h1>

              <Text
                size="lg"
                className="text-foreground/75 max-w-md text-lg leading-[1.7] lg:text-xl"
              >
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

        <div className="relative aspect-[4/5] w-full overflow-hidden lg:absolute lg:inset-y-0 lg:right-0 lg:aspect-auto lg:w-[44%]">
          <div
            className="absolute inset-0 will-change-transform"
            style={{ transform: 'scale(calc(1 + var(--p) * 0.03))' }}
          >
            <ResponsiveImage
              src={methodImages.heroPortrait}
              alt="Caroline Reed, Founder and Director of The Nervous System Institute, in a professional portrait with warm natural light."
              fill
              priority
              className="object-cover object-[50%_22%]"
              sizes="(max-width: 1024px) 100vw, 44vw"
            />
          </div>
        </div>
      </ScrollLinked>
    </section>
  );
}
