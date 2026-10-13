import type { MetadataRoute } from 'next';
import { getArticleSitemapEntries } from '@/lib/articles';
import { absoluteUrl } from '@/lib/seo';

const STATIC_ROUTES = [
  '/',
  '/about',
  '/method',
  '/programs',
  '/programs/practitioner-certification',
  '/programs/executive-advisory',
  '/programs/life-beyond-trauma',
  '/programs/regulation-suite',
  '/programs/academy',
  '/programs/organisational-advisory',
  '/apply/practitioner-certification',
  '/prospectus/practitioner-certification',
  '/prospectus/executive-advisory',
  '/resources',
  '/articles',
  '/research',
  '/assessment',
  '/book-a-call',
  '/contact',
  '/privacy',
  '/terms',
  '/accessibility',
  '/cookies',
] as const;

/**
 * `lastModified` is set only from a genuine document date (an article's CMS
 * `_updatedAt`/`publishedAt`). Static pages have no per-page modification
 * date anywhere in the codebase, and the sitemap's own generation time is not
 * one, so those entries omit `lastModified` rather than report a false value.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticEntries = STATIC_ROUTES.map((path) => ({
    url: absoluteUrl(path),
    changeFrequency: 'weekly' as const,
    priority: path === '/' ? 1 : 0.8,
  }));

  const articleEntries = (await getArticleSitemapEntries()).map(({ slug, lastModified }) => ({
    url: absoluteUrl(`/articles/${slug}`),
    ...(lastModified ? { lastModified } : {}),
    changeFrequency: 'monthly' as const,
    priority: 0.7,
  }));

  return [...staticEntries, ...articleEntries];
}
