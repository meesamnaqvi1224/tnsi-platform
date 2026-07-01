import { ChapterMarker, Container, Section, Stack } from '@tnsi/ui';
import { ResearchPillar } from '@/components/research/research-pillar';
import { researchContent } from '@/content/research';

const { pillars } = researchContent;

export function ResearchPillarsSection() {
  return (
    <Section spacing="xl" className="border-border border-t" aria-label={pillars.heading}>
      <Container size="xl">
        <Stack gap="2xl">
          <ChapterMarker index={pillars.chapter} as="h2" title={pillars.heading} />

          <div className="grid grid-cols-1 gap-(--space-2xl) md:grid-cols-2">
            {pillars.items.map((pillar, index) => (
              <ResearchPillar key={pillar.id} pillar={pillar} index={index} />
            ))}
          </div>
        </Stack>
      </Container>
    </Section>
  );
}
