import { ChapterMarker, Container, Section } from '@tnsi/ui';
import { ResearchInitiative } from '@/components/research/research-initiative';
import { researchContent } from '@/content/research';

const { initiatives } = researchContent;

export function ResearchInitiativesSection() {
  return (
    <Section spacing="xl" className="border-border border-t" aria-label={initiatives.heading}>
      <Container size="xl">
        <div className="flex flex-col gap-(--space-2xl)">
          <ChapterMarker index={initiatives.chapter} as="h2" title={initiatives.heading} />

          <div className="grid grid-cols-1 gap-(--space-3xl) lg:grid-cols-3">
            {initiatives.items.map((initiative) => (
              <ResearchInitiative key={initiative.id} initiative={initiative} />
            ))}
          </div>
        </div>
      </Container>
    </Section>
  );
}
