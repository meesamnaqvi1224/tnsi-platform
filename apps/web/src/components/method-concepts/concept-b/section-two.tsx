import { Container, Eyebrow, Heading, Section, Stack, Text } from '@tnsi/ui';

const steps = [
  {
    number: '01',
    title: 'Understand',
    body: 'Map the patterns. Learn the science. Name what the body has been doing, and why.',
  },
  {
    number: '02',
    title: 'Regulate',
    body: 'Build practical capacity for physiological safety. Move out of default activation or shutdown.',
  },
  {
    number: '03',
    title: 'Rewire',
    body: 'Create lasting neural pathway change through evidence-based somatic and attachment-informed approaches.',
  },
  {
    number: '04',
    title: 'Lead',
    body: 'Lead from regulated strength — in relationships, teams, and organisations.',
  },
] as const;

/**
 * Concept B — Section Two: Minimal Ruled Step List
 * Ultra-clean: centered heading, then a narrow single column of ruled
 * steps. Number left, content right. No decoration beyond the dividers.
 * Every element stripped to its minimum necessary presence.
 */
export function ConceptBSectionTwo() {
  return (
    <Section spacing="lg" aria-labelledby="cb-s2-heading">
      <Container size="xl">
        <div className="mb-(--space-3xl) text-center">
          <Eyebrow className="mb-(--space-sm)">The Framework</Eyebrow>
          <Heading as="h2" id="cb-s2-heading" size="xl">
            Four stages of change.
          </Heading>
        </div>

        {/* Narrow single-column ruled list — centred on the page */}
        <div className="divide-border border-border mx-auto max-w-2xl divide-y border-y">
          {steps.map((step) => (
            <div key={step.number} className="flex gap-(--space-xl) py-(--space-lg)">
              <Text
                as="span"
                size="sm"
                tone="muted"
                className="w-8 shrink-0 pt-[0.2rem] font-mono tabular-nums"
              >
                {step.number}
              </Text>
              <Stack gap="xs" className="flex-1">
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
  );
}
