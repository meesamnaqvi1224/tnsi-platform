import { ChapterMarker, Container, Section } from '@tnsi/ui';
import { CategoryNavigation } from '@/components/articles/category-navigation';
import { articlesContent } from '@/content/articles';

const { categories } = articlesContent;

export function ArticlesCategories() {
  return (
    <Section spacing="xl" className="border-border border-t" aria-label={categories.heading}>
      <Container size="xl">
        <div className="flex flex-col gap-(--space-3xl)">
          <ChapterMarker index={categories.chapter} as="h2" title={categories.heading} />
          <CategoryNavigation categories={categories.items} />
        </div>
      </Container>
    </Section>
  );
}
