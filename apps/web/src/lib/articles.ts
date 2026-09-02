import { sanityFetch } from '@tnsi/cms/server';
import { ARTICLE_BY_SLUG_QUERY, ARTICLE_SLUGS_QUERY } from '@tnsi/cms';
import { articlesContent } from '@/content/articles';
import type { ArticleItem } from '@/content/articles';
import { nervousSystemFrameworkPost } from '@/content/article-posts/nervous-system-framework';
import type { ArticleBodyBlock, ArticlePost } from '@/content/article-posts/types';

const defaultPost = nervousSystemFrameworkPost;

/** Slugs from the static articles listing — each resolves to the master template with tailored metadata, used only when a slug has no matching Sanity document. */
const listingSlugs = articlesContent.latest.items.map((item) => item.slug);

const featuredSlug = 'nervous-system-framework';

const staticSlugs = [...new Set([featuredSlug, ...listingSlugs])];

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

/** Raw shapes returned by `ARTICLE_BY_SLUG_QUERY` / `ARTICLE_SLUGS_QUERY`. */
interface SanityImage {
  url?: string;
  alt?: string;
}
interface SanityBodyBlock {
  _type: string;
  style?: string;
  listItem?: string;
  children?: { text: string }[];
  // figure (image)
  url?: string;
  alt?: string;
  caption?: string;
  // callout
  title?: string;
  text?: string;
}
interface SanityArticleDetail {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  coverImage?: SanityImage;
  category?: string;
  author?: { name: string; role?: string; bio?: string; photo?: SanityImage };
  readingTime?: string;
  publishedAt?: string;
  body?: SanityBodyBlock[];
  seo?: { seoTitle?: string; seoDescription?: string };
  related?: {
    title: string;
    slug: string;
    excerpt: string;
    coverImage?: SanityImage;
    category?: string;
  }[];
}

function formatMonth(iso?: string): string {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
}

function plainText(block: SanityBodyBlock): string {
  return (block.children ?? []).map((child) => child.text).join('');
}

/** "How relationships shape lives" -> "how-relationships-shape-lives", for in-page heading anchors. */
function headingId(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

/**
 * Sanity's `blockContent` (Portable Text: `block`, the `figure` image
 * member, and the `callout` object — see
 * packages/cms/src/schema/objects/blockContent.ts) into the site's existing
 * `ArticleBodyBlock` render DSL. Inline marks (bold/italic/links) are
 * flattened to plain text — `ArticleBodyBlock`'s paragraph type has never
 * carried rich text, even for the hand-authored template, so this isn't a
 * new limitation.
 */
function transformSanityBody(blocks: SanityBodyBlock[] | undefined): ArticleBodyBlock[] {
  if (!blocks || blocks.length === 0) return [];

  const result: ArticleBodyBlock[] = [];
  let list: { style: 'bullet' | 'number'; items: string[] } | null = null;

  function flushList() {
    if (!list) return;
    result.push(
      list.style === 'bullet'
        ? { type: 'unorderedList', items: list.items }
        : { type: 'orderedList', items: list.items },
    );
    list = null;
  }

  for (const block of blocks) {
    if (block._type === 'block') {
      if (block.listItem) {
        const style = block.listItem === 'number' ? 'number' : 'bullet';
        if (!list || list.style !== style) {
          flushList();
          list = { style, items: [] };
        }
        list.items.push(plainText(block));
        continue;
      }

      flushList();
      const text = plainText(block);
      if (block.style === 'h2' || block.style === 'h3') {
        result.push({
          type: 'heading',
          level: block.style === 'h2' ? 2 : 3,
          text,
          id: headingId(text),
        });
      } else if (block.style === 'blockquote') {
        result.push({ type: 'pullQuote', quote: text });
      } else if (text) {
        result.push({ type: 'paragraph', text });
      }
      continue;
    }

    flushList();

    if (block._type === 'figure') {
      result.push({
        type: 'figure',
        imageSrc: block.url,
        imageAlt: block.alt ?? '',
        caption: block.caption ?? '',
        variant: 'inline',
      });
      continue;
    }

    if (block._type === 'callout') {
      result.push({ type: 'callout', title: block.title, text: block.text ?? '' });
    }
  }

  flushList();
  return result;
}

function mapSanityArticle(doc: SanityArticleDetail): ArticlePost {
  const authorName = doc.author?.name ?? 'The Nervous System Institute';
  const authorRole = doc.author?.role ?? '';

  return {
    slug: doc.slug,
    seo: {
      title: doc.seo?.seoTitle ?? `${doc.title} — The Nervous System Institute`,
      description: doc.seo?.seoDescription ?? doc.excerpt,
    },
    hero: {
      category: doc.category ?? '',
      publishedAt: formatMonth(doc.publishedAt),
      readingTime: doc.readingTime ?? '',
      headline: doc.title,
      subtitle: doc.excerpt,
      imageAlt: doc.coverImage?.alt ?? doc.title,
      imageSrc: doc.coverImage?.url,
      author: { name: authorName, role: authorRole },
    },
    body: transformSanityBody(doc.body),
    // Not part of the Sanity `article` schema — never fabricated.
    takeaways: undefined,
    author: {
      name: authorName,
      role: authorRole,
      biography: doc.author?.bio ?? '',
      imageAlt: doc.author?.photo?.alt ?? authorName,
      imageSrc: doc.author?.photo?.url,
      href: '/about',
    },
    related: (doc.related ?? []).map((item) => ({
      slug: item.slug,
      category: item.category ?? '',
      title: item.title,
      summary: item.excerpt,
      imageAlt: item.coverImage?.alt ?? item.title,
      imageSrc: item.coverImage?.url,
    })),
    // Not part of the Sanity `article` schema — never fabricated.
    footerQuote: undefined,
  };
}

/**
 * Every slug that should resolve to a real article page: the Sanity
 * `article` catalog plus the static demo slugs (kept so the hand-authored
 * template stays reachable). Used for `generateStaticParams` and the
 * sitemap — mirrors `getLatestArticles`' existing Sanity-with-static-fallback
 * pattern (`content/cms/loaders.ts`).
 */
export async function getAllArticleSlugs(): Promise<string[]> {
  const sanitySlugs = (await sanityFetch<string[]>(ARTICLE_SLUGS_QUERY)) ?? [];
  return [...new Set([...staticSlugs, ...sanitySlugs])];
}

/**
 * A single article by slug. Checks Sanity first — this is what makes
 * publishing a new article in Studio actually reach its own page instead of
 * 404ing. Falls back to the static demo template only for the pre-existing
 * static slugs, so nothing that already worked breaks.
 */
export async function getArticleBySlug(slug: string): Promise<ArticlePost | null> {
  const sanityArticle = await sanityFetch<SanityArticleDetail>(ARTICLE_BY_SLUG_QUERY, { slug });
  if (sanityArticle) {
    return mapSanityArticle(sanityArticle);
  }

  if (!staticSlugs.includes(slug)) {
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
