import { Container, Eyebrow, Section, Stack, Text } from '@tnsi/ui';
import { FadeIn } from '@/components/utility/fade-in';

const pillars = [
  { title: 'Evidence-Informed', description: 'Grounded in peer-reviewed neuroscience' },
  { title: 'Education', description: 'Rigorous academic methodology' },
  { title: 'Leadership & Advisory', description: 'For ambitious women and executives' },
] as const;

export function TrustBar() {
  return (
    <Section spacing="md" aria-label="Who The Nervous System Institute serves">
      <Container size="xl">
        <FadeIn>
          <Eyebrow className="mb-(--space-lg)">Who It&apos;s For</Eyebrow>
          <div className="border-border grid grid-cols-1 gap-(--space-lg) border-t pt-(--space-lg) md:grid-cols-3">
            {pillars.map((pillar) => (
              <Stack key={pillar.title} gap="2xs">
                <Text weight="semibold">{pillar.title}</Text>
                <Text size="sm" tone="muted">
                  {pillar.description}
                </Text>
              </Stack>
            ))}
          </div>
        </FadeIn>
      </Container>
    </Section>
  );
}
