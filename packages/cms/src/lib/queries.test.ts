import { describe, expect, it } from 'vitest';
import {
  ARTICLE_API_BY_SLUG_QUERY,
  ARTICLE_MIN_BODY_CHARS,
  ARTICLE_SITEMAP_QUERY,
  ARTICLE_SLUGS_QUERY,
  ARTICLES_LIST_API_QUERY,
  ARTICLES_QUERY,
} from './queries';

const FILTER = `length(pt::text(body)) >= ${ARTICLE_MIN_BODY_CHARS}`;

describe('article queries only return articles with a real body', () => {
  it.each([
    ['ARTICLES_QUERY', ARTICLES_QUERY],
    ['ARTICLE_SLUGS_QUERY', ARTICLE_SLUGS_QUERY],
    ['ARTICLE_SITEMAP_QUERY', ARTICLE_SITEMAP_QUERY],
    ['ARTICLE_API_BY_SLUG_QUERY', ARTICLE_API_BY_SLUG_QUERY],
  ])('%s applies the body filter', (_name, query) => {
    expect(query).toContain(FILTER);
  });

  it('ARTICLES_LIST_API_QUERY applies the filter to both the items and the total', () => {
    expect(ARTICLES_LIST_API_QUERY.split(FILTER)).toHaveLength(3);
  });
});
