import NextLink from 'next/link';
import { buttonVariants, Eyebrow, Stack, Text } from '@tnsi/ui';

/**
 * Concept A — Large Split-Screen Editorial
 * Hero: Dark left panel (text, bottom-anchored) + full-bleed image right.
 * Inspired by broadsheet front pages: oversized serif, ruled by whitespace.
 */
export function ConceptAHero() {
  return (
    <section
      aria-labelledby="ca-hero-heading"
      className="grid min-h-screen grid-cols-1 lg:grid-cols-[55fr_45fr]"
    >
      {/* Left — Deep Slate editorial panel */}
      <div className="dark bg-background text-foreground flex flex-col justify-end px-(--space-xl) pt-(--space-4xl) pb-(--space-3xl) sm:px-(--space-2xl) lg:px-(--space-3xl)">
        <Stack gap="lg" className="max-w-lg">
          <Eyebrow className="text-muted-foreground">The Method</Eyebrow>
          <h1
            id="ca-hero-heading"
            className="font-heading text-foreground text-5xl leading-[1.05] font-semibold tracking-tight lg:text-6xl xl:text-[4.5rem]"
          >
            Life Beyond
            <br />
            Trauma.
          </h1>
          <Text size="lg" tone="muted" className="max-w-sm">
            A fifteen-year methodology for rebuilding the physiological foundation of sustainable
            performance.
          </Text>
          <div>
            <NextLink href="#" className={buttonVariants({ variant: 'primary', size: 'lg' })}>
              Explore the Method
            </NextLink>
          </div>
        </Stack>
      </div>

      {/* Right — full-bleed image, no padding, bleeds to viewport edge */}
      {/* TODO: swap for approved editorial portrait once added to apps/web/public */}
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
