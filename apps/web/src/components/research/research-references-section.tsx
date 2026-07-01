import { ChapterMarker, Container, Section, Stack, Text } from '@tnsi/ui';
import { ReferenceList } from '@/components/research/reference-list';
import { researchContent } from '@/content/research';

const { references } = researchContent;

export function ResearchReferencesSection() {
  return (
    <Section
      id={references.id}
      spacing="xl"
      className="border-border border-t"
      aria-label={references.heading}
    >
      <Container size="xl">
        <Stack gap="2xl">
          <div className="max-w-2xl">
            <ChapterMarker index={references.chapter} as="h2" title={references.heading} />
            <Text tone="muted" className="mt-(--space-lg) leading-relaxed">
              {references.intro}
            </Text>
          </div>

          <ReferenceList references={references.items} />
        </Stack>
      </Container>
    </Section>
  );
}
