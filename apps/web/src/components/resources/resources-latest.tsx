import { ChapterMarker, Container, Section, Stack } from '@tnsi/ui';
import { ResourceCard } from '@/components/resources/resource-card';
import { resourcesContent } from '@/content/resources';

const { latest } = resourcesContent;

export function ResourcesLatest() {
  return (
    <Section
      id="latest"
      spacing="none"
      className="border-border border-t"
      aria-label={latest.heading}
    >
      <Container size="xl" className="px-(--space-xl) py-(--space-4xl) sm:px-(--space-2xl)">
        <Stack gap="2xl">
          <ChapterMarker index={latest.chapter} as="h2" title={latest.heading} />
        </Stack>
      </Container>

      <div>
        {latest.items.map((resource) => (
          <ResourceCard key={resource.id} resource={resource} />
        ))}
      </div>
    </Section>
  );
}
