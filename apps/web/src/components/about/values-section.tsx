import { Container, Eyebrow, Grid, Heading, Section, Stack, Text } from '@tnsi/ui';

const values = [
  {
    title: 'Evidence-informed',
    description:
      'Every framework we teach is grounded in peer-reviewed neuroscience. We translate research, not opinion.',
  },
  {
    title: 'Rigorous education',
    description:
      'We hold our programs to academic standards. Transformation requires depth, not shortcuts.',
  },
  {
    title: 'Safety first',
    description:
      'We teach from a foundation of physiological safety. Our approach is explicitly not therapy — but it is always trauma-informed.',
  },
  {
    title: 'Long-term capacity',
    description:
      'We are not interested in temporary relief. Everything we do aims at durable neural change and expanded leadership capacity.',
  },
] as const;

export function ValuesSection() {
  return (
    <Section spacing="lg" className="bg-secondary" aria-labelledby="values-heading">
      <Container size="xl">
        <Stack gap="sm" className="max-w-2xl">
          <Eyebrow>Our Principles</Eyebrow>
          <Heading as="h2" id="values-heading" size="xl">
            What we stand for.
          </Heading>
        </Stack>
        <Grid cols="4" gap="xl" className="mt-[var(--space-2xl)]">
          {values.map((value) => (
            <Stack key={value.title} gap="sm">
              <Text weight="semibold">{value.title}</Text>
              <Text size="sm" tone="muted">
                {value.description}
              </Text>
            </Stack>
          ))}
        </Grid>
      </Container>
    </Section>
  );
}
