import { describe, expect, it } from 'vitest';
import { articlesContent, type ArticleItem } from '@/content/articles';
import {
  categorySlug,
  filterByCategory,
  groupArticlesForLayout,
  matchesCategory,
} from '@/lib/article-layout';

function article(
  n: number,
  category = 'Neuroscience',
  variant: ArticleItem['variant'] = 'compact',
) {
  return {
    id: `a${n}`,
    slug: `s${n}`,
    title: `Title ${n}`,
    summary: `Summary ${n}`,
    category,
    publishedAt: 'June 2026',
    readingTime: '5 min read',
    imageSrc: `/img/${n}.webp`,
    imageAlt: `Alt ${n}`,
    href: `/articles/s${n}`,
    variant,
  } satisfies ArticleItem;
}

const many = (count: number) => Array.from({ length: count }, (_, i) => article(i + 1));

describe('groupArticlesForLayout', () => {
  it('places every article exactly once, in order, for any list length', () => {
    for (let count = 0; count <= 30; count += 1) {
      const items = many(count);
      const placed = groupArticlesForLayout(items).flatMap((group) => [...group.items]);
      expect(placed.map((item) => item.id)).toEqual(items.map((item) => item.id));
    }
  });

  it('repeats lead, pair, index', () => {
    const kinds = groupArticlesForLayout(many(12)).map((group) => group.kind);
    expect(kinds).toEqual(['lead', 'pair', 'index', 'lead', 'pair', 'index']);
  });

  it('shows a leftover single story as a lead, never half a pair', () => {
    const groups = groupArticlesForLayout(many(2));
    expect(groups.map((group) => group.kind)).toEqual(['lead', 'lead']);
  });

  it('keeps all eleven articles that the old three-column rule dropped', () => {
    const groups = groupArticlesForLayout(many(11));
    expect(groups.flatMap((group) => group.items)).toHaveLength(11);
  });

  it('ignores the content "variant" hint', () => {
    const items = [article(1, 'A', 'compact'), article(2, 'A', 'large'), article(3, 'A', 'medium')];
    const placed = groupArticlesForLayout(items).flatMap((group) => [...group.items]);
    expect(placed).toHaveLength(3);
  });

  it('returns nothing for an empty list', () => {
    expect(groupArticlesForLayout([])).toEqual([]);
  });
});

describe('category matching', () => {
  it('slugs a label the way the category links do', () => {
    expect(categorySlug('Trauma Recovery')).toBe('trauma-recovery');
    expect(categorySlug('  Practitioner   Education ')).toBe('practitioner-education');
  });

  it('accepts the slug, the label and the encoded label', () => {
    const item = article(1, 'Trauma Recovery');
    expect(matchesCategory(item, 'trauma-recovery')).toBe(true);
    expect(matchesCategory(item, 'Trauma Recovery')).toBe(true);
    expect(matchesCategory(item, 'Trauma%20Recovery')).toBe(true);
    expect(matchesCategory(item, 'leadership')).toBe(false);
  });

  it('does not throw on a malformed percent escape', () => {
    expect(matchesCategory(article(1), '%E0%A4%A')).toBe(false);
  });

  it('filters, and returns every article when no category is set', () => {
    const items = [article(1, 'Research'), article(2, 'Leadership'), article(3, 'Research')];
    expect(filterByCategory(items, 'research').map((item) => item.id)).toEqual(['a1', 'a3']);
    expect(filterByCategory(items, undefined)).toHaveLength(3);
    expect(filterByCategory(items, '')).toHaveLength(3);
  });
});

describe('multi-word categories, using the real static article data', () => {
  const items = articlesContent.latest.items;
  const multiWord = [...new Set(items.map((item) => item.category))].filter((c) => c.includes(' '));

  it('has multi-word categories to test with', () => {
    expect(multiWord).toEqual(
      expect.arrayContaining(['Trauma Recovery', 'Practitioner Education']),
    );
  });

  it.each(multiWord)(
    'filters "%s" the same way from slug, label and legacy encoded-label URLs',
    (label) => {
      const expected = items.filter((item) => item.category === label).map((item) => item.id);
      expect(expected.length).toBeGreaterThan(0);

      for (const param of [
        categorySlug(label),
        label,
        encodeURIComponent(label),
        label.toUpperCase(),
      ]) {
        expect(filterByCategory(items, param).map((item) => item.id)).toEqual(expected);
      }
    },
  );

  it('never hides an article: every category filter plus the unfiltered list adds up', () => {
    const categories = [...new Set(items.map((item) => item.category))];
    const total = categories.reduce(
      (sum, category) =>
        sum +
        groupArticlesForLayout(filterByCategory(items, categorySlug(category))).flatMap(
          (group) => group.items,
        ).length,
      0,
    );
    expect(total).toBe(items.length);
    expect(groupArticlesForLayout(items).flatMap((group) => group.items)).toHaveLength(
      items.length,
    );
  });
});
