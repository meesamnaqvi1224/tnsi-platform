import { beforeEach, describe, expect, it, vi } from 'vitest';

const getArticleSitemapEntries = vi.fn();
vi.mock('@/lib/articles', () => ({
  getArticleSitemapEntries: (...a: unknown[]) => getArticleSitemapEntries(...a),
}));
vi.mock('@/lib/seo', () => ({
  absoluteUrl: (path: string) => `https://thenervoussysteminstitute.com${path}`,
}));

import sitemap from './sitemap';
import robots from './robots';

describe('sitemap', () => {
  beforeEach(() => {
    getArticleSitemapEntries.mockReset();
    getArticleSitemapEntries.mockResolvedValue([
      { slug: 'dated-article', lastModified: new Date('2026-09-15T08:30:00Z') },
      { slug: 'undated-article' },
    ]);
  });

  it('omits lastModified for static pages', async () => {
    const entries = await sitemap();
    const statics = entries.filter((e) => !e.url.includes('/articles/'));
    expect(statics.length).toBe(23);
    expect(statics.every((e) => !('lastModified' in e))).toBe(true);
  });

  it('uses the article date when available and omits it otherwise', async () => {
    const entries = await sitemap();
    const dated = entries.find((e) => e.url.endsWith('/articles/dated-article'));
    const undated = entries.find((e) => e.url.endsWith('/articles/undated-article'));
    expect(dated?.lastModified).toEqual(new Date('2026-09-15T08:30:00Z'));
    expect(undated).toBeDefined();
    expect(undated && 'lastModified' in undated).toBe(false);
  });

  it('never stamps any entry with the generation time', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2030-01-01T00:00:00Z'));
    const entries = await sitemap();
    vi.useRealTimers();
    expect(
      entries.some((e) => e.lastModified && new Date(e.lastModified).getFullYear() === 2030),
    ).toBe(false);
  });

  it('keeps the canonical host, unique URLs, and leaves auth pages out', async () => {
    const urls = (await sitemap()).map((e) => e.url);
    expect(new Set(urls).size).toBe(urls.length);
    expect(urls.every((u) => u.startsWith('https://thenervoussysteminstitute.com/'))).toBe(true);
    expect(urls.some((u) => u.includes('/sign-in') || u.includes('/sign-up'))).toBe(false);
  });

  it('keeps the unlaunched Return Path page out of the sitemap', async () => {
    const urls = (await sitemap()).map((e) => e.url);
    expect(urls.some((u) => u.includes('the-return-path'))).toBe(false);
  });

  it('does not block the auth pages in robots.txt', () => {
    const rules = robots().rules as { disallow?: string[] };
    expect(rules.disallow).toEqual(['/api/']);
  });
});
