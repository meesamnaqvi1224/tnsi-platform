import { Container, Section, Stack, Text } from '@tnsi/ui';

/**
 * Concept C — Section One: Asymmetric Magazine Layout
 * Pull-quote occupies a narrow left column in large italic serif —
 * the kind of typographic device you'd find in The Guardian or Monocle.
 * The wide right column carries the editorial body, creating visual tension
 * between the condensed quote and the flowing prose.
 */
export function ConceptCSectionOne() {
  return (
    <Section spacing="xl" aria-labelledby="cc-s1-heading">
      <Container size="xl">
        <div className="border-border grid grid-cols-1 gap-(--space-2xl) border-t pt-(--space-xl) lg:grid-cols-[2fr_3fr] lg:gap-(--space-4xl)">
          {/* Left — typographic pull-quote with attribution */}
          <div className="lg:pt-(--space-xs)">
            <p className="font-heading text-foreground text-2xl leading-snug font-semibold tracking-tight italic lg:text-3xl">
              &ldquo;The body keeps the score — and it also holds the key.&rdquo;
            </p>
            <Text size="sm" tone="muted" className="mt-(--space-md) not-italic">
              Caroline Reed, Founder &amp; Director
            </Text>
          </div>

          {/* Right — editorial body */}
          <Stack gap="md">
            <h2
              id="cc-s1-heading"
              className="font-heading text-foreground text-xl font-semibold tracking-tight"
            >
              The philosophy behind fifteen years of research.
            </h2>
            <Text tone="muted" className="max-w-prose">
              In conventional performance culture, the nervous system is treated as an inconvenience
              — a system to be managed, suppressed, or overridden in service of output. We were
              taught that discipline and willpower could compensate for whatever the body was
              signalling.
            </Text>
            <Text tone="muted" className="max-w-prose">
              Clinical practice told a different story. The women who arrived with the most
              impressive credentials were often those most disconnected from their physiological
              experience. They had succeeded precisely by learning not to feel what they were
              feeling — and that disconnection was the source of their exhaustion, not its cure.
            </Text>
          </Stack>
        </div>
      </Container>
    </Section>
  );
}
