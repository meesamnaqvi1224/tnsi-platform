import { sanityFetch } from '@tnsi/cms/server';
import { ARTICLES_QUERY, ASSESSMENT_BY_SLUG_QUERY, PROGRAMS_QUERY } from '@tnsi/cms';
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

export interface AssessmentChoice {
  key: string;
  label: string;
  value: number;
}

export interface AssessmentQuestion {
  key: string;
  text: string;
  choices: AssessmentChoice[];
}

export interface AssessmentResultTier {
  key: string;
  title: string;
  minScore: number;
  maxScore: number;
  description?: string;
}

/**
 * An assessment's full editorial definition, as authored in Sanity. Generic
 * across every assessment the `assessment` document type can define — no
 * field here is specific to Capacity Assessment or any other single
 * assessment. `scoringMethod` is left as the raw string Sanity returns
 * (rather than narrowed to packages/core's `AssessmentScoringMethod` union)
 * since this loader has no opinion on which methods are valid — that's
 * `scoreAssessment`'s job, and it already fails safe on one it doesn't
 * recognise.
 */
export interface Assessment {
  id: string;
  title: string;
  slug: string;
  questions: AssessmentQuestion[];
  scoringMethod: string;
  resultTiers: AssessmentResultTier[];
  /** Unwired identifiers, carried through for a future email/CRM mapping — see packages/cms/src/schema/documents/assessment.ts. */
  emailSequence?: string;
  crmPipeline?: string;
  seo?: { seoTitle?: string; seoDescription?: string };
}

/**
 * Loads a single published assessment by slug. Returns `null` when Sanity
 * is not configured, the slug doesn't exist, or the matching document isn't
 * published — every case is treated as "not currently available" rather
 * than an error, so callers can render a safe empty state instead of
 * inventing placeholder assessment content. Deliberately has no hardcoded
 * fallback content (unlike `getLatestArticles`/`getComparisonPrograms`
 * above): there is no approved placeholder for real assessment questions.
 */
export async function getAssessmentBySlug(slug: string): Promise<Assessment | null> {
  return sanityFetch<Assessment>(ASSESSMENT_BY_SLUG_QUERY, { slug });
}
