import { Container, Eyebrow, Section, Stack, Text } from '@tnsi/ui';

const pillars = [
  { title: 'Evidence-Informed', description: 'Grounded in peer-reviewed neuroscience' },
  { title: 'Education', description: 'Rigorous academic methodology' },
  { title: 'Leadership & Advisory', description: 'For ambitious women and executives' },
] as const;

export function TrustBar() {
  return (
    <Section spacing="md" aria-label="Who The Nervous System Institute serves">
      <Container size="xl">
        <Eyebrow className="mb-(--space-md)">Who It&apos;s For</Eyebrow>
        <div className="grid grid-cols-1 gap-(--space-md) md:grid-cols-3">
          {pillars.map((pillar) => (
            <Stack
              key={pillar.title}
              gap="2xs"
              className="border-border bg-card rounded-sm border px-(--space-lg) py-(--space-lg)"
            >
              <Text weight="semibold">{pillar.title}</Text>
              <Text size="sm" tone="muted">
                {pillar.description}
              </Text>
            </Stack>
          ))}
        </div>
      </Container>
    </Section>
  );
}
