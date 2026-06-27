import { Container, Section, Stack, Text } from '@tnsi/ui';

const pillars = [
  { title: 'Evidence-Informed', description: 'Grounded in peer-reviewed neuroscience' },
  { title: 'Education', description: 'Rigorous academic methodology' },
  { title: 'Leadership & Advisory', description: 'For ambitious women and executives' },
] as const;

export function TrustBar() {
  return (
    <Section spacing="md" aria-label="Why The Nervous System Institute">
      <Container size="xl">
        <div className="divide-border grid grid-cols-1 divide-y sm:grid-cols-3 sm:divide-x sm:divide-y-0">
          {pillars.map((pillar) => (
            <Stack
              key={pillar.title}
              gap="2xs"
              className="px-(--space-lg) py-(--space-md) first:pl-0 last:pr-0"
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
