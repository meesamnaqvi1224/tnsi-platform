import { ChapterMarker, Container, Section, Stack } from '@tnsi/ui';
import { ResourceCard } from '@/components/resources/resource-card';
import { getLatestArticles } from '@/content/cms/loaders';
import { resourcesContent, type ResourceItem } from '@/content/resources';

const { latest } = resourcesContent;

const MAX_ITEMS = 6;

/**
 * The newest published articles. Reads the same source as the Insights page, so
 * only articles with a real body appear and nothing links to a placeholder.
 * Renders nothing when there are none.
 */
export async function ResourcesLatest() {
  const articles = await getLatestArticles();
  const items: ResourceItem[] = articles.slice(0, MAX_ITEMS).map((article, index) => ({
    id: article.id,
    title: article.title,
    category: article.category,
    summary: article.summary,
    readingTime: article.readingTime,
    publishedAt: article.publishedAt,
    href: article.href,
    imageSrc: article.imageSrc,
    imageAlt: article.imageAlt,
    layout: index % 2 === 0 ? 'image-left' : 'image-right',
  }));

  if (items.length === 0) return null;

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
        {items.map((resource) => (
          <ResourceCard key={resource.id} resource={resource} />
        ))}
      </div>
    </Section>
  );
}
