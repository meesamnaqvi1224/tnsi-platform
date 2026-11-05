import { describe, expect, it } from 'vitest';
import type { ArticleListItem } from '@/api/types';
import {
  NO_ARTICLE_FILTERS,
  articleCategories,
  filterArticles,
  hasArticleFilters,
  type ArticleFilters,
} from './article-library';

function article(id: string, over: Partial<ArticleListItem> = {}): ArticleListItem {
  return {
    id,
    title: id,
    slug: id,
    excerpt: '',
    coverImage: null,
    category: null,
    author: null,
    publishedAt: null,
    readingTime: null,
    featured: false,
    ...over,
  };
}

const research = { slug: 'research', title: 'Research' } as ArticleListItem['category'];
const trauma = { slug: 'trauma-recovery', title: 'Trauma Recovery' } as ArticleListItem['category'];

const library = [
  article('a', {
    title: 'Why the Nervous System Matters',
    excerpt: 'An introduction to regulation.',
    category: research,
    author: { name: 'Caroline Reed', role: null },
  }),
  article('b', { title: 'Café Rituals', excerpt: 'Slow mornings.', category: trauma }),
  article('c', { title: 'Untagged Note', excerpt: 'Participation can begin early.' }),
];

const ids = (list: ArticleListItem[]) => list.map((a) => a.id);
const filters = (over: Partial<ArticleFilters>): ArticleFilters => ({
  ...NO_ARTICLE_FILTERS,
  ...over,
});

describe('article search', () => {
  it('returns everything with no filters', () => {
    expect(filterArticles(library, NO_ARTICLE_FILTERS)).toHaveLength(3);
  });

  it('finds title, excerpt, category and author, ignoring case and accents', () => {
    expect(ids(filterArticles(library, filters({ query: 'nervous' })))).toEqual(['a']);
    expect(ids(filterArticles(library, filters({ query: 'PARTICIPATION' })))).toEqual(['c']);
    expect(ids(filterArticles(library, filters({ query: 'trauma' })))).toEqual(['b']);
    expect(ids(filterArticles(library, filters({ query: 'caroline' })))).toEqual(['a']);
    expect(ids(filterArticles(library, filters({ query: 'cafe' })))).toEqual(['b']);
  });

  it('needs every word, in any order', () => {
    expect(ids(filterArticles(library, filters({ query: 'regulation introduction' })))).toEqual([
      'a',
    ]);
    expect(filterArticles(library, filters({ query: 'regulation slow' }))).toEqual([]);
  });

  it('combines search and category', () => {
    expect(
      ids(filterArticles(library, filters({ category: 'research', query: 'nervous' }))),
    ).toEqual(['a']);
    expect(
      filterArticles(library, filters({ category: 'trauma-recovery', query: 'nervous' })),
    ).toEqual([]);
  });
});

describe('categories and active state', () => {
  it('lists only the categories present, first-seen order', () => {
    expect(articleCategories(library).map((c) => c.slug)).toEqual(['research', 'trauma-recovery']);
  });

  it('reports whether anything is narrowing the list', () => {
    expect(hasArticleFilters(NO_ARTICLE_FILTERS)).toBe(false);
    expect(hasArticleFilters(filters({ query: '  ' }))).toBe(false);
    expect(hasArticleFilters(filters({ query: 'x' }))).toBe(true);
    expect(hasArticleFilters(filters({ category: 'research' }))).toBe(true);
  });
});
