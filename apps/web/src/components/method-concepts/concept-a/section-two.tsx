import { Container, Eyebrow, Heading, Section, Stack, Text } from '@tnsi/ui';

const steps = [
  {
    number: '01',
    title: 'Understand',
    body: 'Map the nervous system patterns shaped by achievement culture, early experience, and sustained stress. Understanding creates the ground for change.',
  },
  {
    number: '02',
    title: 'Regulate',
    body: 'Develop practical regulatory capacity. Move from a default of chronic activation or shutdown toward physiological states of safety and presence.',
  },
  {
    number: '03',
    title: 'Rewire',
    body: 'Use evidence-based approaches to create lasting neural pathway change — not coping strategies that require constant renewal.',
  },
  {
    number: '04',
    title: 'Lead',
    body: 'Lead yourself, your relationships, and your organisation from a foundation of regulated strength. Capacity, not performance pressure, as the engine.',
  },
] as const;

/**
 * Concept A — Section Two: Table-Style Numbered Framework
 * Ruled rows in an editorial grid: mono number | bold title | body.
 * The dividers carry the structure; nothing else needs to.
 */
export function ConceptASectionTwo() {
  return (
    <Section spacing="lg" className="bg-secondary" aria-labelledby="ca-s2-heading">
      <Container size="xl">
        <div className="mb-(--space-2xl) flex flex-col gap-(--space-sm) sm:flex-row sm:items-end sm:justify-between">
          <Stack gap="sm">
            <Eyebrow>The Framework</Eyebrow>
            <Heading as="h2" id="ca-s2-heading" size="xl">
              Four stages. One direction.
            </Heading>
          </Stack>
        </div>

        {/* Ruled step rows */}
        <div className="divide-border border-border divide-y border-t">
          {steps.map((step) => (
            <div
              key={step.number}
              className="grid grid-cols-1 gap-(--space-md) py-(--space-xl) sm:grid-cols-[3.5rem_1fr] lg:grid-cols-[3.5rem_12rem_1fr]"
            >
              <Text as="span" size="sm" tone="muted" className="font-mono tabular-nums">
                {step.number}
              </Text>
              <Text weight="semibold">{step.title}</Text>
              <Text tone="muted" className="max-w-prose lg:max-w-none">
                {step.body}
              </Text>
            </div>
          ))}
        </div>
      </Container>
    </Section>
  );
}
