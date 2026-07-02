import { ChapterMarker, Container, Section, Stack, Text } from '@tnsi/ui';
import { discoveryCallContent, type ProcessStep } from '@/content/discovery-call';

const { process } = discoveryCallContent;

function ProcessStepCard({ number, title, description }: ProcessStep) {
  return (
    <article className="interaction-card-surface bg-background/60 hover:bg-background flex flex-col gap-(--space-lg) rounded-lg border p-(--space-2xl)">
      <span className="font-heading text-muted-foreground/60 text-4xl leading-none font-light tracking-tight">
        {number}
      </span>
      <Stack gap="sm">
        <h3 className="font-heading text-foreground text-xl font-semibold tracking-tight">
          {title}
        </h3>
        <Text tone="muted" className="text-sm leading-relaxed">
          {description}
        </Text>
      </Stack>
    </article>
  );
}

export function ProcessSteps() {
  return (
    <Section spacing="xl" className="border-border border-t" aria-label={process.heading}>
      <Container size="xl">
        <Stack gap="3xl">
          <ChapterMarker
            index={process.chapter}
            as="h2"
            title={process.heading}
            className="mx-auto max-w-2xl text-center lg:mx-0 lg:text-left"
          />

          <div className="grid grid-cols-1 gap-(--space-lg) sm:grid-cols-2 lg:gap-(--space-xl)">
            {process.steps.map((step) => (
              <ProcessStepCard key={step.number} {...step} />
            ))}
          </div>
        </Stack>
      </Container>
    </Section>
  );
}
