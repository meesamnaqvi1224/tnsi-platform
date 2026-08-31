import { articlesContent } from '@/content/articles';
import type { ArticleItem } from '@/content/articles';
import { nervousSystemFrameworkPost } from '@/content/article-posts/nervous-system-framework';
import type { ArticlePost } from '@/content/article-posts/types';

const defaultPost = nervousSystemFrameworkPost;

/** Slugs from the articles listing — each resolves to the master template with tailored metadata. */
const listingSlugs = articlesContent.latest.items.map((item) => item.slug);

const featuredSlug = 'nervous-system-framework';

const allSlugs = [...new Set([featuredSlug, ...listingSlugs])];

function mergeListingMeta(slug: string, post: ArticlePost): ArticlePost {
  const listingItem = articlesContent.latest.items.find((item) => item.slug === slug);
  const featured = slug === featuredSlug ? articlesContent.featured : null;

  if (!listingItem && !featured) {
    return post;
  }

  const source = listingItem ?? {
    slug: featuredSlug,
    title: articlesContent.featured.title,
    summary: articlesContent.featured.summary,
    category: articlesContent.featured.category,
    publishedAt: articlesContent.featured.publishedAt,
    readingTime: articlesContent.featured.readingTime,
    imageAlt: articlesContent.featured.imageAlt,
    href: articlesContent.featured.href,
    id: featuredSlug,
    variant: 'large' as const,
  };

  return {
    ...post,
    slug,
    seo: {
      title: `${source.title} — The Nervous System Institute`,
      description: source.summary,
    },
    hero: {
      ...post.hero,
      category: source.category,
      publishedAt: source.publishedAt,
      readingTime: source.readingTime,
      headline: source.title,
      subtitle: source.summary,
      imageAlt: source.imageAlt,
    },
  };
}

export function getAllArticleSlugs(): string[] {
  return allSlugs;
}

export function getArticleBySlug(slug: string): ArticlePost | null {
  if (!allSlugs.includes(slug)) {
    return null;
  }

  return mergeListingMeta(slug, { ...defaultPost, slug });
}

export interface ArticleCategoryCount {
  category: string;
  count: number;
}

/**
 * Derives the real category list — with real counts — directly from a given
 * list of articles, in first-seen order. This is the single source of truth
 * for category filtering; there is no separately maintained category list.
 */
export function getArticleCategoryCounts(
  items: readonly Pick<ArticleItem, 'category'>[],
): ArticleCategoryCount[] {
  const counts = new Map<string, number>();

  for (const item of items) {
    counts.set(item.category, (counts.get(item.category) ?? 0) + 1);
  }

  return Array.from(counts.entries()).map(([category, count]) => ({ category, count }));
}
