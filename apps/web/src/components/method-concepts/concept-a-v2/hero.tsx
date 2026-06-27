import NextLink from 'next/link';
import { buttonVariants, Eyebrow, Stack, Text } from '@tnsi/ui';

/**
 * Concept A v2 — Split-Screen Editorial, Hero
 *
 * Changes from v1:
 * — Panel narrowed to 45% (image gains breath; it supports, not competes)
 * — All whitespace increased ≥25%: pt 96→128px, pb 64→96px, px 48→64px, Stack gap 24→32px
 * — Headline enlarged two steps on lg/xl (80→88px at xl)
 * — Supporting copy column narrowed: max-w-sm → max-w-[18rem] for tighter editorial reading
 * — Short accent rule above eyebrow — editorial provenance mark, not decoration
 * — Copy voice: factual and restrained, no performance language
 */
export function ConceptAV2Hero() {
  return (
    <section
      aria-labelledby="ca-v2-hero-heading"
      className="grid min-h-screen grid-cols-1 lg:grid-cols-[45fr_55fr]"
    >
      {/* Left — Deep Slate editorial panel, text anchored to bottom */}
      <div className="dark bg-background text-foreground flex flex-col justify-end px-(--space-xl) pt-(--space-5xl) pb-(--space-4xl) sm:px-(--space-3xl) lg:px-(--space-3xl)">
        <Stack gap="xl" className="max-w-lg">
          {/* Short accent rule above eyebrow — editorial section marker */}
          <div>
            <div className="border-border mb-(--space-md) w-10 border-t-2" />
            <Eyebrow className="text-muted-foreground">The Method</Eyebrow>
          </div>

          <h1
            id="ca-v2-hero-heading"
            className="font-heading text-foreground text-5xl leading-[1.03] font-semibold tracking-tight lg:text-[4.5rem] xl:text-[5.5rem]"
          >
            Life Beyond
            <br />
            Trauma.
          </h1>

          <Stack gap="lg">
            <Text size="lg" tone="muted" className="max-w-[18rem]">
              Not a technique for managing symptoms. A different physiological foundation — built at
              the level where patterns actually live.
            </Text>
            <div>
              <NextLink href="#" className={buttonVariants({ variant: 'primary', size: 'lg' })}>
                Explore the Method
              </NextLink>
            </div>
          </Stack>
        </Stack>
      </div>

      {/* Right — image, full height, no padding, bleeds to viewport edge */}
      {/* TODO: swap for approved full-bleed portrait once added to apps/web/public */}
      <div className="bg-secondary relative hidden lg:block">
        <div className="absolute inset-0 flex items-end justify-start p-(--space-lg)">
          <Text size="sm" tone="muted">
            Full-bleed editorial image
          </Text>
        </div>
      </div>
    </section>
  );
}
