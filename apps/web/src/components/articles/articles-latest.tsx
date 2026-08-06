import { ChapterMarker, Container, Section } from '@tnsi/ui';
import { ArticleCard } from '@/components/articles/article-card';
import { Pagination } from '@/components/articles/pagination';
import { articlesContent } from '@/content/articles';
import type { ArticleItem } from '@/content/articles';
import { getLatestArticles } from '@/content/cms/loaders';

const { latest, pagination } = articlesContent;

type ArticleGroup =
  | { type: 'large'; items: [ArticleItem] }
  | { type: 'medium'; items: [ArticleItem, ArticleItem] }
  | { type: 'compact'; items: [ArticleItem, ArticleItem, ArticleItem] };

function groupArticles(items: readonly ArticleItem[]): ArticleGroup[] {
  const groups: ArticleGroup[] = [];
  let index = 0;

  while (index < items.length) {
    const large = items[index];
    if (large?.variant === 'large') {
      groups.push({ type: 'large', items: [large] });
      index += 1;
    }

    const medium = items.slice(index, index + 2).filter((item) => item.variant === 'medium');
    if (medium.length === 2) {
      groups.push({ type: 'medium', items: medium as [ArticleItem, ArticleItem] });
      index += 2;
    }

    const compact = items.slice(index, index + 3).filter((item) => item.variant === 'compact');
    if (compact.length === 3) {
      groups.push({ type: 'compact', items: compact as [ArticleItem, ArticleItem, ArticleItem] });
      index += 3;
    } else {
      break;
    }
  }

  return groups;
}

export async function ArticlesLatest() {
  const items = await getLatestArticles();
  const articleGroups = groupArticles(items);

  return (
    <Section
      id="latest"
      spacing="none"
      className="border-border border-t"
      aria-label={latest.heading}
    >
      <Container size="xl" className="px-(--space-xl) py-(--space-4xl) sm:px-(--space-2xl)">
        <ChapterMarker index={latest.chapter} as="h2" title={latest.heading} />
      </Container>

      <div className="flex flex-col">
        {articleGroups.map((group, groupIndex) => {
          if (group.type === 'large') {
            return <ArticleCard key={group.items[0].id} article={group.items[0]} />;
          }

          if (group.type === 'medium') {
            return (
              <div
                key={`medium-${groupIndex}`}
                className="border-border grid grid-cols-1 border-t lg:grid-cols-2"
              >
                {group.items.map((article) => (
                  <ArticleCard key={article.id} article={article} />
                ))}
              </div>
            );
          }

          return (
            <div
              key={`compact-${groupIndex}`}
              className="border-border grid grid-cols-1 border-t md:grid-cols-3"
            >
              {group.items.map((article) => (
                <div
                  key={article.id}
                  className="border-border px-(--space-xl) md:border-l md:first:border-l-0"
                >
                  <ArticleCard article={article} />
                </div>
              ))}
            </div>
          );
        })}
      </div>

      <Container size="xl" className="px-(--space-xl) py-(--space-4xl) sm:px-(--space-2xl)">
        <Pagination
          currentPage={pagination.currentPage}
          totalPages={pagination.totalPages}
          baseHref={pagination.baseHref}
        />
      </Container>
    </Section>
  );
}
