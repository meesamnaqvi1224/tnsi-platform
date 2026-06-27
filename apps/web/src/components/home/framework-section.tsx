import { Compass, RefreshCw, Search, Wind } from 'lucide-react';
import { Container, Eyebrow, Grid, Heading, Section, Stack, Text } from '@tnsi/ui';

const steps = [
  {
    number: '01',
    title: 'Understand',
    description:
      'Learn how your nervous system was shaped by early experience, stress, and achievement culture.',
    icon: Search,
  },
  {
    number: '02',
    title: 'Regulate',
    description:
      'Develop practical tools to move out of dysregulation and into a physiological state of safety.',
    icon: Wind,
  },
  {
    number: '03',
    title: 'Rewire',
    description:
      'Use evidence-based approaches to create lasting neural pathway change and expanded capacity.',
    icon: RefreshCw,
  },
  {
    number: '04',
    title: 'Lead',
    description:
      'Lead yourself, your relationships and your organisation from a foundation of regulated strength.',
    icon: Compass,
  },
] as const;

export function FrameworkSection() {
  return (
    <Section spacing="lg" aria-labelledby="framework-heading">
      <Container size="xl">
        <Stack gap="sm" className="max-w-2xl">
          <Eyebrow>The Framework</Eyebrow>
          <Heading as="h2" id="framework-heading" size="xl">
            We help you move from survival to capacity.
          </Heading>
        </Stack>

        <Grid cols="4" gap="xl" className="mt-(--space-2xl)">
          {steps.map((step) => (
            <Stack
              key={step.number}
              gap="sm"
              className="group duration-base ease-standard transition-transform hover:-translate-y-1"
            >
              <step.icon aria-hidden className="text-muted-foreground size-5" />
              <Text size="sm" tone="muted">
                {step.number}
              </Text>
              <Text weight="semibold">{step.title}</Text>
              <Text size="sm" tone="muted">
                {step.description}
              </Text>
            </Stack>
          ))}
        </Grid>
      </Container>
    </Section>
  );
}
