import type { ArticleItem } from '@/content/articles';

/**
 * Editorial layout for the Insights listing.
 *
 * The listing repeats a three-beat rhythm - one lead story, a pair, then a
 * text-led index - and every article is placed in exactly one beat. The
 * grouping depends only on the ORDER of the articles, never on their count or
 * on the `variant` hint in the content data, so a category filter or a CMS
 * list of any length can never leave an article out.
 */
export type ArticleGroup =
  | { kind: 'lead'; items: readonly [ArticleItem] }
  | { kind: 'pair'; items: readonly [ArticleItem, ArticleItem] }
  | { kind: 'index'; items: readonly ArticleItem[] };

/** Articles per beat, in rhythm order. The index beat takes up to this many. */
export const LEAD_SIZE = 1;
export const PAIR_SIZE = 2;
export const INDEX_SIZE = 3;

export function groupArticlesForLayout(items: readonly ArticleItem[]): ArticleGroup[] {
  const groups: ArticleGroup[] = [];
  let position = 0;
  let beat: 'lead' | 'pair' | 'index' = 'lead';

  while (position < items.length) {
    if (beat === 'lead') {
      groups.push({ kind: 'lead', items: [items[position]!] });
      position += LEAD_SIZE;
      beat = 'pair';
    } else if (beat === 'pair') {
      const pair = items.slice(position, position + PAIR_SIZE);
      if (pair.length === PAIR_SIZE) {
        groups.push({ kind: 'pair', items: [pair[0]!, pair[1]!] });
      } else {
        // A single leftover is shown as a lead story rather than half a pair.
        groups.push({ kind: 'lead', items: [pair[0]!] });
      }
      position += pair.length;
      beat = 'index';
    } else {
      const index = items.slice(position, position + INDEX_SIZE);
      groups.push({ kind: 'index', items: index });
      position += index.length;
      beat = 'lead';
    }
  }

  return groups;
}

/** "Trauma Recovery" -> "trauma-recovery". The URL form of a category. */
export function categorySlug(label: string): string {
  return label.toLowerCase().trim().replace(/\s+/g, '-');
}

/**
 * Whether an article belongs to the category named in the `?category=` query.
 * The query may be the slug (`trauma-recovery`) or the display label
 * (`Trauma Recovery`, which older links and bookmarks use); both match.
 */
export function matchesCategory(item: Pick<ArticleItem, 'category'>, param: string): boolean {
  return categorySlug(item.category) === categorySlug(safeDecode(param));
}

export function filterByCategory<T extends Pick<ArticleItem, 'category'>>(
  items: readonly T[],
  param: string | undefined,
): T[] {
  if (!param) return [...items];
  return items.filter((item) => matchesCategory(item, param));
}

function safeDecode(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}
