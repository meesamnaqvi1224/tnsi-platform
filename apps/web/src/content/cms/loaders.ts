import { sanityFetch } from '@tnsi/cms/server';
import { ARTICLES_QUERY, PROGRAMS_QUERY } from '@tnsi/cms';
import { articlesContent, type ArticleItem } from '@/content/articles';
import { programsOverviewContent } from '@/content/programs';

/** Raw shapes returned by the GROQ projections. */
interface SanityImage {
  url?: string;
  alt?: string;
}
interface SanityArticle {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  coverImage?: SanityImage;
  category?: string;
  readingTime?: string;
  publishedAt?: string;
  featured?: boolean;
}
interface SanityProgram {
  id: string;
  title: string;
  slug: string;
  audience?: string;
  overview: string;
  format?: string;
  duration?: string;
  outcome?: string;
  ctaHref?: string;
}

function formatMonth(iso?: string): string {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
}

// Repeating layout rhythm the listing expects: one large, two medium, three compact.
const VARIANT_PATTERN: ArticleItem['variant'][] = [
  'large',
  'medium',
  'medium',
  'compact',
  'compact',
  'compact',
];

/**
 * Latest articles for the Articles listing. Reads from Sanity and maps into
 * the ArticleItem shape the cards render; falls back to the hardcoded
 * content when the CMS is not configured or returns nothing.
 */
export async function getLatestArticles(): Promise<readonly ArticleItem[]> {
  const docs = await sanityFetch<SanityArticle[]>(ARTICLES_QUERY);
  if (!docs || docs.length === 0) return articlesContent.latest.items;

  return docs.map((doc, index) => ({
    id: doc.id,
    slug: doc.slug,
    title: doc.title,
    summary: doc.excerpt,
    category: doc.category ?? 'Article',
    publishedAt: formatMonth(doc.publishedAt),
    readingTime: doc.readingTime ?? '',
    imageSrc: doc.coverImage?.url ?? '/images/articles/latest-polyvagal.webp',
    imageAlt: doc.coverImage?.alt ?? doc.title,
    href: `/articles/${doc.slug}`,
    variant: VARIANT_PATTERN[index % VARIANT_PATTERN.length]!,
  }));
}

export interface ComparisonProgram {
  title: string;
  audience: string;
  format: string;
  duration: string;
  outcome: string;
  href: string;
}

/**
 * Programs for the "Compare Pathways" table. Reads from Sanity; falls back
 * to hardcoded content when the CMS is empty or unconfigured.
 */
export async function getComparisonPrograms(): Promise<readonly ComparisonProgram[]> {
  const docs = await sanityFetch<SanityProgram[]>(PROGRAMS_QUERY);
  if (!docs || docs.length === 0) return programsOverviewContent.comparison;

  return docs.map((doc) => ({
    title: doc.title,
    audience: doc.audience ?? '',
    format: doc.format ?? '',
    duration: doc.duration ?? '',
    outcome: doc.outcome ?? '',
    href: doc.ctaHref ?? `/programs/${doc.slug}`,
  }));
}
