import NextLink from 'next/link';
import { buttonVariants, Eyebrow, Stack, Text } from '@tnsi/ui';

/**
 * Concept C — Magazine-Style Immersive
 * Hero: Full-viewport image with gradient fade into Deep Slate.
 * Text overlaid at bottom-left — the image is the atmosphere,
 * typography anchors the message. Cinematic scale.
 */
export function ConceptCHero() {
  return (
    <section aria-labelledby="cc-hero-heading" className="dark relative flex min-h-screen flex-col">
      {/* Full-bleed background image */}
      {/* TODO: swap for approved full-bleed Caroline Reed/editorial asset once added to apps/web/public */}
      <div className="bg-secondary absolute inset-0" aria-hidden>
        <div className="flex h-full items-center justify-center">
          <Text size="sm" tone="muted">
            Full-bleed image placeholder
          </Text>
        </div>
      </div>

      {/* Gradient: transparent → Deep Slate, so text reads cleanly at bottom */}
      <div
        aria-hidden
        className="absolute inset-0"
        style={{ background: 'linear-gradient(to bottom, transparent 25%, var(--background) 85%)' }}
      />

      {/* Text content anchored to bottom of viewport */}
      <div className="relative mt-auto px-(--space-xl) pt-(--space-4xl) pb-(--space-3xl) sm:px-(--space-2xl) lg:px-(--space-3xl)">
        <Stack gap="lg" className="max-w-2xl">
          <Eyebrow className="text-muted-foreground">The Method</Eyebrow>
          <h1
            id="cc-hero-heading"
            className="font-heading text-foreground text-5xl leading-[1.05] font-semibold tracking-tight lg:text-6xl xl:text-[4.5rem]"
          >
            Life Beyond
            <br />
            Trauma.
          </h1>
          <Text size="lg" tone="muted" className="max-w-sm">
            An evidence-informed methodology for physiological and lasting transformation.
          </Text>
          <div>
            <NextLink href="#" className={buttonVariants({ variant: 'primary', size: 'lg' })}>
              Explore the Method
            </NextLink>
          </div>
        </Stack>
      </div>
    </section>
  );
}
