import { Container, Eyebrow, Heading, Stack, Text } from '@tnsi/ui';

export function AboutHero() {
  return (
    <section aria-labelledby="about-hero-heading" className="dark bg-background text-foreground">
      <Container size="xl" className="py-[var(--space-3xl)]">
        <Stack gap="md" className="max-w-3xl">
          <Eyebrow className="text-muted-foreground">Our Story</Eyebrow>
          <Heading as="h1" id="about-hero-heading" size="2xl" className="text-4xl sm:text-5xl">
            Science-led. Humanity-centred.
          </Heading>
          <Text size="lg" tone="muted" className="max-w-prose">
            The Nervous System Institute exists because the most ambitious people in the world are
            often the most dysregulated — and conventional tools have failed them. We offer a
            different way forward: evidence-informed education rooted in fifteen years of clinical
            research.
          </Text>
        </Stack>
      </Container>
    </section>
  );
}
