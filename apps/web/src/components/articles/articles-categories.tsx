import { ChapterMarker, Container, Section } from '@tnsi/ui';
import { CategoryNavigation } from '@/components/articles/category-navigation';
import { articlesContent } from '@/content/articles';
import type { ArticleCategoryCount } from '@/lib/articles';

const { categories } = articlesContent;

export interface ArticlesCategoriesProps {
  categories: ArticleCategoryCount[];
  activeCategory?: string;
}

export function ArticlesCategories({
  categories: categoryCounts,
  activeCategory,
}: ArticlesCategoriesProps) {
  return (
    <Section
      id="categories"
      spacing="xl"
      className="border-border border-t"
      aria-label={categories.heading}
    >
      <Container size="xl">
        <div className="flex flex-col gap-(--space-3xl)">
          <ChapterMarker index={categories.chapter} as="h2" title={categories.heading} />
          <CategoryNavigation categories={categoryCounts} activeCategory={activeCategory} />
        </div>
      </Container>
    </Section>
  );
}
