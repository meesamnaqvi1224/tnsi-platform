import { beforeEach, describe, expect, it, vi } from 'vitest';

const sanityFetch = vi.fn();
vi.mock('@tnsi/cms/server', () => ({ sanityFetch: (...a: unknown[]) => sanityFetch(...a) }));
vi.mock('@tnsi/cms', () => ({
  ARTICLE_BY_SLUG_QUERY: 'by-slug',
  ARTICLE_MIN_BODY_CHARS: 500,
  ARTICLE_SITEMAP_QUERY: 'sitemap',
  ARTICLE_SLUGS_QUERY: 'slugs',
}));

import { getArticleBySlug, hasPublishedBody } from './articles';

const paragraph = (text: string) => ({ _type: 'block', style: 'normal', children: [{ text }] });
const LONG = paragraph('A real paragraph of article text. '.repeat(20));

function sanityDoc(slug: string, body: unknown[] | undefined) {
  return { id: slug, title: `Title of ${slug}`, slug, excerpt: 'Summary.', body };
}

describe('hasPublishedBody', () => {
  it('rejects an empty or missing body and a headline-length stub', () => {
    expect(hasPublishedBody(undefined)).toBe(false);
    expect(hasPublishedBody([])).toBe(false);
    expect(hasPublishedBody([paragraph('Just a sentence.')])).toBe(false);
  });

  it('accepts a body with enough real text', () => {
    expect(hasPublishedBody([LONG])).toBe(true);
  });
});

describe('getArticleBySlug', () => {
  beforeEach(() => sanityFetch.mockReset());

  it('returns null for a Sanity article with an empty body (placeholder), not a generic template', async () => {
    sanityFetch.mockResolvedValue(sanityDoc('window-of-tolerance', []));
    expect(await getArticleBySlug('window-of-tolerance')).toBeNull();
  });

  it('returns null for a former template slug that has no Sanity article', async () => {
    sanityFetch.mockResolvedValue(null);
    for (const slug of ['case-integration', 'physiology-of-burnout', 'team-dysregulation']) {
      expect(await getArticleBySlug(slug)).toBeNull();
    }
  });

  it('returns a Sanity article that has a real body, under its own headline', async () => {
    sanityFetch.mockResolvedValue(sanityDoc('living-on-autopilot', [LONG]));
    const post = await getArticleBySlug('living-on-autopilot');
    expect(post?.hero.headline).toBe('Title of living-on-autopilot');
    expect(post?.body.length).toBeGreaterThan(0);
  });

  it('still serves the featured framework article from its template when Sanity has nothing usable', async () => {
    sanityFetch.mockResolvedValue(null);
    const post = await getArticleBySlug('nervous-system-framework');
    expect(post?.slug).toBe('nervous-system-framework');
    expect(post?.body.length).toBeGreaterThan(0);
  });

  it('returns null for an unknown slug', async () => {
    sanityFetch.mockResolvedValue(null);
    expect(await getArticleBySlug('does-not-exist')).toBeNull();
  });
});
