import { CapacityJourney, ChapterMarker, Container, Section, Stack, Text } from '@tnsi/ui';

const stages = [
  {
    stage: 'Survival',
    description:
      'The starting point for most people. The nervous system is operating as though threat is constant — chronic activation, burnout, or shutdown — often without the awareness that this is what is happening.',
  },
  {
    stage: 'Understand',
    description:
      'Education is the first intervention. When the physiology beneath behaviour becomes legible, self-blame begins to dissolve. Understanding is not passive — it is the first act of regulation.',
  },
  {
    stage: 'Regulate',
    description:
      'Practical tools for moving the nervous system into states of safety, presence and social engagement. Not suppression — resourcing. The body learns that safety is available.',
  },
  {
    stage: 'Rewire',
    description:
      'Lasting change is physiological, not psychological. New neural pathways are built through structured practice. The nervous system no longer needs the old pattern — because it has a better one.',
  },
  {
    stage: 'Lead',
    description:
      'The quality of leadership, relationships and performance available from a regulated nervous system is fundamentally different. This is the foundation all Institute programs are built toward.',
  },
] as const;

export function ProgramsJourney() {
  return (
    <Section spacing="xl" className="border-border border-t" aria-label="The learning journey">
      <Container size="xl">
        <Stack gap="2xl">
          <ChapterMarker index="II" as="h2" size="xl" title="The Learning Journey" />

          <Stack gap="lg" className="max-w-2xl">
            <Text tone="muted" className="max-w-prose">
              Transformation does not happen at once. It happens in stages — each one creating the
              physiological conditions for the next. Every program at the Institute is designed
              around this arc.
            </Text>
          </Stack>

          <CapacityJourney />

          <div className="grid grid-cols-1 gap-(--space-xl) pt-(--space-lg) sm:grid-cols-2 xl:grid-cols-5">
            {stages.map(({ stage, description }) => (
              <div key={stage} className="border-border border-t pt-(--space-lg)">
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
