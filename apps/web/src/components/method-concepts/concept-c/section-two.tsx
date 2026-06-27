import { Container, Eyebrow, Heading, Section, Stack, Text } from '@tnsi/ui';

const steps = [
  {
    number: '01',
    title: 'Understand',
    body: 'Map the nervous system patterns shaped by achievement culture, early experience, and sustained stress.',
  },
  {
    number: '02',
    title: 'Regulate',
    body: 'Build practical tools to move from chronic activation or shutdown into physiological states of safety.',
  },
  {
    number: '03',
    title: 'Rewire',
    body: 'Create lasting neural pathway change through evidence-based somatic and attachment-informed approaches.',
  },
  {
    number: '04',
    title: 'Lead',
    body: 'Lead yourself, your relationships and your organisation from a foundation of regulated strength.',
  },
] as const;

/**
 * Concept C — Section Two: Cinematic Quote Band + Border-Accent Grid
 * Opens with a full-bleed Deep Slate band carrying a large italic quote —
 * the atmospheric counterpart to the hero. Below: a 2×2 step grid where
 * a left-border accent line is the only decoration.
 */
export function ConceptCSectionTwo() {
  return (
    <>
      {/* Full-bleed Dark Statement Band */}
      <div className="dark bg-background text-foreground py-(--space-3xl)">
        <Container size="xl">
          <p className="font-heading text-foreground mx-auto max-w-3xl text-center text-3xl leading-snug font-semibold tracking-tight italic lg:text-4xl">
            &ldquo;Regulation is not the absence of feeling. It is the capacity to feel — and remain
            present.&rdquo;
          </p>
        </Container>
      </div>

      {/* 2×2 Border-Accent Step Grid */}
      <Section spacing="lg" aria-labelledby="cc-s2-heading">
        <Container size="xl">
          <Stack gap="sm" className="mb-(--space-2xl)">
            <Eyebrow>The Framework</Eyebrow>
            <Heading as="h2" id="cc-s2-heading" size="xl">
              How change happens.
            </Heading>
          </Stack>

          <div className="grid grid-cols-1 gap-(--space-xl) sm:grid-cols-2">
            {steps.map((step) => (
              <div key={step.number} className="border-border border-l-2 pl-(--space-lg)">
                <Stack gap="sm">
                  <Text as="span" size="sm" tone="muted" className="font-mono tabular-nums">
                    {step.number}
                  </Text>
                  <Text weight="semibold">{step.title}</Text>
                  <Text size="sm" tone="muted">
                    {step.body}
                  </Text>
                </Stack>
              </div>
            ))}
          </div>
        </Container>
      </Section>
    </>
  );
}
