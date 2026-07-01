import { ChapterMarker, Container, Section } from '@tnsi/ui';
import { Timeline } from '@/components/research/timeline';
import { researchContent } from '@/content/research';

const { timeline } = researchContent;

export function ResearchTimelineSection() {
  return (
    <Section
      spacing="xl"
      className="border-border bg-secondary/20 border-t"
      aria-label={timeline.heading}
    >
      <Container size="xl">
        <div className="flex flex-col gap-(--space-3xl)">
          <ChapterMarker index={timeline.chapter} as="h2" title={timeline.heading} />
          <Timeline events={timeline.events} intro={timeline.intro} />
        </div>
      </Container>
    </Section>
  );
}
