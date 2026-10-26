import NextLink from 'next/link';
import { Container, Section } from '@tnsi/ui';
import { EditorialIndex, LeadStory, PairedStories } from '@/components/articles/article-card';
import { CategoryNavigation } from '@/components/articles/category-navigation';
import { articlesContent } from '@/content/articles';
import { getLatestArticles } from '@/content/cms/loaders';
import { filterByCategory, groupArticlesForLayout } from '@/lib/article-layout';
import type { ArticleCategoryCount } from '@/lib/articles';

const { latest } = articlesContent;

export interface ArticlesLatestProps {
  /** From the `?category=` query param - filters to matching articles when set. */
  category?: string;
  categories: ArticleCategoryCount[];
}

/**
 * The listing: heading, category filter, then every matching article in the
 * lead / pair / index rhythm. The grouping places each article exactly once,
 * so no category or list length can hide one.
 */
export async function ArticlesLatest({ category, categories }: ArticlesLatestProps) {
  const allItems = await getLatestArticles();
  const items = filterByCategory(allItems, category);
  const groups = groupArticlesForLayout(items);

  return (
    <Section
      id="latest"
      spacing="none"
      className="scroll-mt-20"
      aria-labelledby="articles-latest-heading"
    >
      <Container
        size="xl"
        className="flex flex-col gap-(--space-2xl) pt-(--space-3xl) lg:pt-(--space-4xl)"
      >
        <div className="flex flex-col gap-(--space-xl)">
          <h2
            id="articles-latest-heading"
            className="font-heading text-foreground text-4xl leading-[1.05] font-semibold tracking-tight sm:text-5xl"
          >
            {latest.heading}
          </h2>

          <div className="flex flex-col gap-(--space-md)">
            <CategoryNavigation categories={categories} activeCategory={category} />
            <p className="text-muted-foreground font-mono text-[0.625rem] tracking-[0.15em] uppercase tabular-nums">
              {items.length} {items.length === 1 ? 'article' : 'articles'}
            </p>
          </div>
        </div>

        {items.length === 0 ? (
          <p className="text-muted-foreground max-w-prose pb-(--space-4xl) leading-relaxed">
            No articles found in this category yet.{' '}
            <NextLink
              href="/articles#latest"
              className="interaction-text-link text-foreground underline underline-offset-4"
            >
              Browse all Insights
            </NextLink>
            .
          </p>
        ) : null}

        <div className="flex flex-col gap-(--space-3xl) pb-(--space-4xl) lg:gap-(--space-4xl)">
          {groups.map((group, groupIndex) => {
            const key = `${group.kind}-${group.items[0]?.id ?? groupIndex}`;
            if (group.kind === 'lead') {
              // Alternate the image side from one lead story to the next.
              const leadsBefore = groups
                .slice(0, groupIndex)
                .filter((earlier) => earlier.kind === 'lead').length;
              const flip = leadsBefore % 2 === 1;
              return <LeadStory key={key} article={group.items[0]} flip={flip} />;
            }
            if (group.kind === 'pair') {
              return <PairedStories key={key} articles={group.items} />;
            }
            return <EditorialIndex key={key} articles={group.items} />;
          })}
        </div>
      </Container>
    </Section>
  );
}
