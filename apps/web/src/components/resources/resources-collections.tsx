import { ChapterMarker, Container, Section, Stack } from '@tnsi/ui';
import { ResourceCollection } from '@/components/resources/resource-collection';
import { resourcesContent } from '@/content/resources';

const { collections } = resourcesContent;

export function ResourcesCollections() {
  return (
    <Section
      spacing="xl"
      className="border-border bg-secondary/20 border-t"
      aria-label={collections.heading}
    >
      <Container size="xl">
        <Stack gap="2xl">
          <ChapterMarker index={collections.chapter} as="h2" title={collections.heading} />

          <div>
            {collections.items.map((collection, index) => (
              <ResourceCollection key={collection.id} collection={collection} index={index} />
            ))}
          </div>
        </Stack>
      </Container>
    </Section>
  );
}
