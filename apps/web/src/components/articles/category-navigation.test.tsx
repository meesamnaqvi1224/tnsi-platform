import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { CategoryNavigation } from '@/components/articles/category-navigation';
import { articlesContent } from '@/content/articles';
import { getArticleCategoryCounts } from '@/lib/articles';

const categories = getArticleCategoryCounts(articlesContent.latest.items);

function render(activeCategory?: string) {
  return renderToStaticMarkup(
    <CategoryNavigation categories={categories} activeCategory={activeCategory} />,
  );
}

/** The text of every link marked as the current page. */
function currentLinks(html: string): string[] {
  return [...html.matchAll(/<a [^>]*aria-current="page"[^>]*>(.*?)<\/a>/g)].map((match) =>
    match[1]!
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim(),
  );
}

describe('CategoryNavigation', () => {
  it('links every category by its slug and lands on the list', () => {
    const html = render();
    expect(html).toContain('href="/articles?category=trauma-recovery#latest"');
    expect(html).toContain('href="/articles?category=practitioner-education#latest"');
    expect(html).toContain('href="/articles#latest"');
  });

  it('marks All Insights as current when no category is chosen', () => {
    expect(currentLinks(render())).toEqual(['All Insights']);
  });

  it.each(['trauma-recovery', 'Trauma Recovery', 'Trauma%20Recovery'])(
    'marks exactly "Trauma Recovery" as current for ?category=%s',
    (param) => {
      const current = currentLinks(render(param));
      expect(current).toHaveLength(1);
      expect(current[0]).toMatch(/^Trauma Recovery/);
    },
  );

  it('marks nothing as current for an unknown category', () => {
    expect(currentLinks(render('nope'))).toEqual([]);
  });
});
