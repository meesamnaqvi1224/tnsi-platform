import { beforeEach, describe, expect, it, vi } from 'vitest';

const sanityFetch = vi.fn();
vi.mock('@tnsi/cms/server', () => ({ sanityFetch: (...a: unknown[]) => sanityFetch(...a) }));
vi.mock('@tnsi/cms', () => ({
  ARTICLE_BY_SLUG_QUERY: 'by-slug',
  ARTICLE_MIN_BODY_CHARS: 500,
  ARTICLE_SLUGS_QUERY: 'slugs',
  ARTICLE_SITEMAP_QUERY: 'sitemap',
}));

import { getAllArticleSlugs, getArticleSitemapEntries } from './articles';

const NOW = new Date('2026-10-13T12:00:00.000Z');

describe('getArticleSitemapEntries', () => {
  beforeEach(() => sanityFetch.mockReset());

  it('uses the CMS _updatedAt, falling back to publishedAt, and omits unreliable dates', async () => {
    sanityFetch.mockImplementation(async (query: string) => {
      if (query === 'sitemap') {
        return [
          {
            slug: 'cms-both',
            publishedAt: '2026-08-01T00:00:00Z',
            _updatedAt: '2026-09-15T08:30:00Z',
          },
          { slug: 'cms-published-only', publishedAt: '2026-07-04T00:00:00Z', _updatedAt: null },
          { slug: 'cms-no-dates', publishedAt: null, _updatedAt: null },
          { slug: 'cms-future', publishedAt: '2030-01-01T00:00:00Z', _updatedAt: undefined },
        ];
      }
      return [];
    });

    const entries = await getArticleSitemapEntries(NOW);
    const get = (slug: string) => entries.find((e) => e.slug === slug);

    expect(get('cms-both')?.lastModified).toEqual(new Date('2026-09-15T08:30:00Z'));
    expect(get('cms-published-only')?.lastModified).toEqual(new Date('2026-07-04T00:00:00Z'));
    expect(get('cms-no-dates')).toEqual({ slug: 'cms-no-dates' });
    expect(get('cms-future')).toEqual({ slug: 'cms-future' });
  });

  it('keeps static fallback articles with no lastModified, and never uses the current time', async () => {
    sanityFetch.mockResolvedValue([]);
    const entries = await getArticleSitemapEntries(NOW);

    expect(entries.length).toBeGreaterThan(0);
    expect(entries.every((e) => e.lastModified === undefined)).toBe(true);
  });

  it('lets a CMS record supply the date for a slug that also exists statically', async () => {
    sanityFetch.mockResolvedValue([]);
    const staticOnly = await getArticleSitemapEntries(NOW);
    const staticSlug = staticOnly[0]!.slug;

    sanityFetch.mockResolvedValue([{ slug: staticSlug, _updatedAt: '2026-10-01T00:00:00Z' }]);
    const merged = await getArticleSitemapEntries(NOW);

    expect(merged.filter((e) => e.slug === staticSlug)).toHaveLength(1);
    expect(merged.find((e) => e.slug === staticSlug)?.lastModified).toEqual(
      new Date('2026-10-01T00:00:00Z'),
    );
  });

  it('returns exactly the same slug set as getAllArticleSlugs', async () => {
    sanityFetch.mockImplementation(async (query: string) =>
      query === 'sitemap'
        ? [{ slug: 'a-cms-article', _updatedAt: '2026-09-01T00:00:00Z' }]
        : ['a-cms-article'],
    );

    const entrySlugs = (await getArticleSitemapEntries(NOW)).map((e) => e.slug).sort();
    const allSlugs = (await getAllArticleSlugs()).slice().sort();
    expect(entrySlugs).toEqual(allSlugs);
  });

  it('survives an unavailable CMS (null) by returning the static slugs undated', async () => {
    sanityFetch.mockResolvedValue(null);
    const entries = await getArticleSitemapEntries(NOW);
    expect(entries.length).toBeGreaterThan(0);
    expect(entries.every((e) => e.lastModified === undefined)).toBe(true);
  });

  it('never lists the former placeholder slugs or any static article except the featured one', async () => {
    sanityFetch.mockResolvedValue([]);
    const slugs = (await getArticleSitemapEntries(NOW)).map((e) => e.slug);
    expect(slugs).toEqual(['nervous-system-framework']);
    for (const placeholder of [
      'window-of-tolerance',
      'polyvagal-theory-in-practice',
      'case-integration',
      'physiology-of-burnout',
      'co-regulation',
    ]) {
      expect(slugs).not.toContain(placeholder);
    }
  });
});
