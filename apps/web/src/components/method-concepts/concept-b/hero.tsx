import NextLink from 'next/link';
import { buttonVariants, Container, Eyebrow, Stack, Text } from '@tnsi/ui';

/**
 * Concept B — Minimal Apple-style Storytelling
 * Hero: Pure centered composition, generous whitespace, no image.
 * Typography does all the work — the headline splits across three lines
 * with the third line in muted tone to create contrast within the type itself.
 */
export function ConceptBHero() {
  return (
    <section
      aria-labelledby="cb-hero-heading"
      className="flex min-h-screen flex-col items-center justify-center px-4 py-(--space-4xl) text-center"
    >
      <Container size="xl">
        <Stack gap="xl" align="center">
          <Eyebrow>The Method</Eyebrow>
          <h1
            id="cb-hero-heading"
            className="font-heading text-foreground text-5xl leading-[1.08] font-semibold tracking-tight lg:text-6xl xl:text-[5.25rem]"
          >
            You don&apos;t need
            <br />
            more discipline.
            <br />
            <span className="text-muted-foreground">You need regulation.</span>
          </h1>
          <Text size="lg" tone="muted" className="max-w-lg">
            The Life Beyond Trauma method — fifteen years of clinical research, structured for
            lasting transformation.
          </Text>
          <Stack direction="row" gap="sm" align="center" justify="center" wrap="wrap">
            <NextLink href="#" className={buttonVariants({ variant: 'primary', size: 'lg' })}>
              Discover the Method
            </NextLink>
            <NextLink href="#" className={buttonVariants({ variant: 'outline', size: 'lg' })}>
              Book a Discovery Call
            </NextLink>
          </Stack>
        </Stack>
      </Container>
    </section>
  );
}
