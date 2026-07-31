import { ChapterMarker, Container, Section, Stack, Text } from '@tnsi/ui';

const stages = [
  {
    stage: 'Survival',
    description:
      'The nervous system is in a state of chronic mobilisation or shutdown — operating as though threat is constant, even when no threat is present. Most people who arrive at the Institute recognise this as their baseline, not their exception.',
  },
  {
    stage: 'Understand',
    description:
      'Education is the first intervention. When people understand polyvagal theory, nervous system states, and the logic of their own adaptations, the self-blame that accompanies burnout and overwhelm begins to dissolve.',
  },
  {
    stage: 'Regulate',
    description:
      'Practical tools to move from activation or shutdown into a physiological state of safety — not by suppressing response, but by resourcing the ventral vagal system that makes social engagement, creativity, and clear thinking possible.',
  },
  {
    stage: 'Rewire',
    description:
      'Lasting change happens through neural pathway formation, not repetition of insight. This stage uses evidence-based somatic and relational approaches to build new patterns at the level where the old ones were written.',
  },
  {
    stage: 'Lead',
    description:
      'Leadership from a regulated nervous system is fundamentally different from leadership driven by survival. The quality of decisions, relationships, and presence available from this foundation cannot be accessed from within activation.',
  },
] as const;

export function MethodJourney() {
  return (
    <Section spacing="xl" className="border-border border-t">
      <Container size="xl">
        <Stack gap="2xl">
          <ChapterMarker index="I" as="h2" size="xl" title="The Capacity Journey" />

          <Stack gap="lg" className="max-w-2xl">
            <Text tone="muted" className="max-w-prose">
              Every person who arrives at the Institute is somewhere on this arc. The journey does
              not begin at Understand — it begins at Survival, which is where most high-achieving
              adults have been operating without knowing it.
            </Text>
            <Text tone="muted" className="max-w-prose">
              The Capacity Journey is not a metric. It is a map — naming where you are without
              judgment, so the work of moving forward can begin.
            </Text>
          </Stack>

          <div className="grid grid-cols-1 gap-(--space-lg) pt-(--space-lg) lg:grid-cols-2 xl:grid-cols-3">
            {stages.map(({ stage, description }) => (
              <div
                key={stage}
                className="bg-secondary border-border rounded-sm border p-(--space-lg)"
              >
                <p className="font-heading text-foreground mb-(--space-sm) text-sm font-semibold tracking-tight">
                  {stage}
                </p>
                <Text size="sm" tone="muted">
                  {description}
                </Text>
              </div>
            ))}
          </div>
        </Stack>
      </Container>
    </Section>
  );
}
