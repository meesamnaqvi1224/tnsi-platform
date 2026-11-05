import type { ArticleListItem } from '@/api/types';
import { queryTokens, normalizeText } from '@/lib/practice-library';

/**
 * Search and category filtering for Resources. Like the Practices Library, everything runs on the
 * articles the screen has already loaded (the first 50): nothing is fetched, so it is instant and
 * cannot fail. Searching the full catalogue would need an API change and is out of scope.
 *
 * Search and the category filter combine: an article must satisfy every active one.
 */

export interface ArticleFilters {
  query: string;
  /** A category slug, or null for all. */
  category: string | null;
}

export const NO_ARTICLE_FILTERS: ArticleFilters = { query: '', category: null };

export function hasArticleFilters(filters: ArticleFilters): boolean {
  return queryTokens(filters.query).length > 0 || filters.category !== null;
}

function searchableText(article: ArticleListItem): string {
  return normalizeText(
    [article.title, article.excerpt, article.category?.title, article.author?.name]
      .filter(Boolean)
      .join(' '),
  );
}

export function filterArticles(
  articles: readonly ArticleListItem[],
  filters: ArticleFilters,
): ArticleListItem[] {
  const tokens = queryTokens(filters.query);
  return articles.filter((article) => {
    if (filters.category && article.category?.slug !== filters.category) return false;
    if (tokens.length === 0) return true;
    const text = searchableText(article);
    return tokens.every((token) => text.includes(token));
  });
}

/** Categories actually present, in first-seen order: never a separately maintained taxonomy. */
export function articleCategories(
  articles: readonly ArticleListItem[],
): { slug: string; title: string }[] {
  const seen = new Map<string, { slug: string; title: string }>();
  for (const article of articles) {
    if (article.category?.slug && !seen.has(article.category.slug)) {
      seen.set(article.category.slug, {
        slug: article.category.slug,
        title: article.category.title,
      });
    }
  }
  return Array.from(seen.values());
}
