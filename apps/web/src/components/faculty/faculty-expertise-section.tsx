import { ChapterMarker, Container, Section } from '@tnsi/ui';
import { FacultyExpertise } from '@/components/faculty/faculty-expertise';
import { facultyContent } from '@/content/faculty';

const { expertise } = facultyContent;

export function FacultyExpertiseSection() {
  return (
    <Section spacing="none" className="border-border border-t" aria-label={expertise.heading}>
      <Container size="xl" className="px-(--space-xl) py-(--space-4xl) sm:px-(--space-2xl)">
        <ChapterMarker index={expertise.chapter} as="h2" title={expertise.heading} />
      </Container>

      <div>
        {expertise.items.map((item) => (
          <FacultyExpertise key={item.id} item={item} />
        ))}
      </div>
    </Section>
  );
}
