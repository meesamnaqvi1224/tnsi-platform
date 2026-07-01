import type { MetadataRoute } from 'next';
import { getAllArticleSlugs } from '@/lib/articles';
import { absoluteUrl } from '@/lib/seo';

const STATIC_ROUTES = [
  '/',
  '/about',
  '/method',
  '/programs',
  '/programs/practitioner-certification',
  '/programs/executive-advisory',
  '/resources',
  '/articles',
  '/research',
  '/faculty',
  '/book-a-call',
  '/contact',
  '/search',
  '/privacy',
  '/terms',
  '/accessibility',
  '/cookies',
] as const;

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  const staticEntries = STATIC_ROUTES.map((path) => ({
    url: absoluteUrl(path),
    lastModified: now,
    changeFrequency: 'weekly' as const,
    priority: path === '/' ? 1 : 0.8,
  }));

  const articleEntries = getAllArticleSlugs().map((slug) => ({
    url: absoluteUrl(`/articles/${slug}`),
    lastModified: now,
    changeFrequency: 'monthly' as const,
    priority: 0.7,
  }));

  return [...staticEntries, ...articleEntries];
}
