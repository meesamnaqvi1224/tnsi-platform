import { ChapterMarker, Container, Section } from '@tnsi/ui';
import { ResearchArea } from '@/components/research/research-area';
import { researchContent } from '@/content/research';

const { areas } = researchContent;

export function ResearchAreasSection() {
  return (
    <Section spacing="none" className="border-border border-t" aria-label={areas.heading}>
      <Container size="xl" className="px-(--space-xl) py-(--space-4xl) sm:px-(--space-2xl)">
        <ChapterMarker index={areas.chapter} as="h2" title={areas.heading} />
      </Container>

      <div>
        {areas.items.map((area) => (
          <ResearchArea key={area.id} area={area} />
        ))}
      </div>
    </Section>
  );
}
