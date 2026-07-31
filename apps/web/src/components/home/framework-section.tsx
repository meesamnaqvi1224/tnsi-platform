import { Container, Divider, Eyebrow, Grid, Heading, Section, Stack, Text } from '@tnsi/ui';
import { FadeIn } from '@/components/utility/fade-in';

const steps = [
  {
    number: '01',
    title: 'Understand',
    description:
      'Learn how your nervous system was shaped by early experience, stress, and achievement culture.',
  },
  {
    number: '02',
    title: 'Regulate',
    description:
      'Develop practical tools to move out of dysregulation and into a physiological state of safety.',
  },
  {
    number: '03',
    title: 'Rewire',
    description:
      'Use evidence-based approaches to create lasting neural pathway change and expanded capacity.',
  },
  {
    number: '04',
    title: 'Lead',
    description:
      'Lead yourself, your relationships and your organisation from a foundation of regulated strength.',
  },
] as const;

export function FrameworkSection() {
  return (
    <Section spacing="xl" aria-labelledby="framework-heading">
      <Container size="xl">
        <FadeIn>
          <Stack gap="sm" className="max-w-2xl">
            <Eyebrow>The Framework</Eyebrow>
            <Heading as="h2" id="framework-heading" size="xl" className="text-3xl sm:text-4xl">
              We help you move from survival to capacity.
            </Heading>
          </Stack>
        </FadeIn>

        <Grid cols="4" gap="xl" className="mt-(--space-3xl) sm:mt-(--space-4xl)">
          {steps.map((step, index) => (
            <FadeIn key={step.number} delayMs={index * 80}>
              <Stack gap="md" className="border-border border-t pt-(--space-lg)">
                <Text
                  as="span"
                  className="font-heading text-muted-foreground/50 text-5xl leading-none font-medium sm:text-6xl"
                >
                  {step.number}
                </Text>
                <Divider className="w-8" />
                <Stack gap="xs">
                  <Heading as="h3" size="xs">
                    {step.title}
                  </Heading>
                  <Text size="sm" tone="muted">
                    {step.description}
                  </Text>
                </Stack>
              </Stack>
            </FadeIn>
          ))}
        </Grid>
      </Container>
    </Section>
  );
}
