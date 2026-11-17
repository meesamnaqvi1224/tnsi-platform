import type { Practice, PracticeContentType } from '@/api/types';
import type { GuidedPractice } from '@/lib/guided-practices';

/**
 * Search and filtering for the Practices Library. Everything here runs on content the
 * screen has already loaded (the practices list, plus the two static guided practices):
 * nothing is fetched, so search is instant and cannot fail.
 *
 * Search is global (guided practices and the library); the Focus and Format filters
 * narrow the library only, since the guided practices have neither a category nor a
 * content type. Search and filters combine: a practice must satisfy every active one.
 */

export interface LibraryFilters {
  query: string;
  /** A practice's raw `category` value, e.g. "GROUNDING". */
  category: string | null;
  type: PracticeContentType | null;
}

export const NO_FILTERS: LibraryFilters = { query: '', category: null, type: null };

/** The nervous-system framework's own order; any other category follows alphabetically. */
const CATEGORY_ORDER = ['GROUNDING', 'REGULATION', 'CENTERING', 'EMBODIMENT', 'EXPANSION'];

const TYPE_ORDER: readonly PracticeContentType[] = [
  'audio',
  'video',
  'meditation',
  'breathwork',
  'movement',
  'journal',
  'interactive',
];

/** Lower-case, accent-insensitive, single-spaced: what both the query and the content are compared as. */
export function normalizeText(value: string): string {
  return value.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();
}

/** The words of a query. Every word must be found (in any order), so "calm breath" matches "Breath to calm". */
export function queryTokens(query: string): string[] {
  const normalized = normalizeText(query);
  return normalized ? normalized.split(' ') : [];
}

/** "GROUNDING" -> "Grounding". Display only; the raw value is what filters compare. */
export function categoryLabel(category: string): string {
  const lower = category.trim().toLowerCase();
  return lower.charAt(0).toUpperCase() + lower.slice(1);
}

/** The distinct categories actually present, so no chip ever leads to a guaranteed-empty result. */
export function practiceCategories(practices: readonly Practice[]): string[] {
  const seen = new Set<string>();
  for (const practice of practices) {
    const category = practice.category?.trim();
    if (category) seen.add(category);
  }
  const rank = (category: string) => {
    const index = CATEGORY_ORDER.indexOf(category.toUpperCase());
    return index === -1 ? CATEGORY_ORDER.length : index;
  };
  return Array.from(seen).sort((a, b) => rank(a) - rank(b) || a.localeCompare(b));
}

/** The distinct content types actually present, in a fixed, familiar order. */
export function practiceTypes(practices: readonly Practice[]): PracticeContentType[] {
  const present = new Set(practices.map((practice) => practice.contentType));
  return TYPE_ORDER.filter((type) => present.has(type));
}

function practiceSearchText(practice: Practice): string {
  return normalizeText(
    [
      practice.title,
      practice.description ?? '',
      practice.category ?? '',
      practice.contentType,
      ...practice.tags,
    ].join(' '),
  );
}

function guidedSearchText(practice: GuidedPractice): string {
  return normalizeText(
    [
      practice.title,
      practice.subtitle,
      practice.description,
      practice.condition,
      practice.format,
      'guided',
    ].join(' '),
  );
}

export function matchesTokens(text: string, tokens: readonly string[]): boolean {
  return tokens.every((token) => text.includes(token));
}

/** Library practices that satisfy the query, the Focus filter and the Format filter together. */
export function filterPractices(
  practices: readonly Practice[],
  filters: LibraryFilters,
): Practice[] {
  const tokens = queryTokens(filters.query);
  const wantedCategory = filters.category?.toUpperCase() ?? null;
  return practices.filter((practice) => {
    if (filters.type && practice.contentType !== filters.type) return false;
    if (wantedCategory && practice.category?.trim().toUpperCase() !== wantedCategory) return false;
    return tokens.length === 0 || matchesTokens(practiceSearchText(practice), tokens);
  });
}

/**
 * Guided practices take part in search only. An active Focus or Format filter is about the
 * library, so it does not hide them; the screen labels the filters as filtering the library.
 */
export function filterGuidedPractices(
  guided: readonly GuidedPractice[],
  query: string,
): GuidedPractice[] {
  const tokens = queryTokens(query);
  if (tokens.length === 0) return [...guided];
  return guided.filter((practice) => matchesTokens(guidedSearchText(practice), tokens));
}

export function isSearching(filters: LibraryFilters): boolean {
  return queryTokens(filters.query).length > 0;
}

export function hasLibraryFilters(filters: LibraryFilters): boolean {
  return filters.category !== null || filters.type !== null;
}

/** "3 practices", "1 practice". */
export function countLabel(count: number): string {
  return `${count} ${count === 1 ? 'practice' : 'practices'}`;
}

/** "12 practices" when nothing is narrowed, "3 of 12 practices" when it is. */
export function resultSummary(shown: number, total: number): string {
  return shown === total ? countLabel(total) : `${shown} of ${countLabel(total)}`;
}
