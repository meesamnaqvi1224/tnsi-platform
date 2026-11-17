import { describe, expect, it } from 'vitest';
import type { Practice } from '@/api/types';
import { NINETY_SECOND_RESET, THE_EMPTY_CHAIR } from '@/lib/guided-practices';
import {
  NO_FILTERS,
  categoryLabel,
  countLabel,
  filterGuidedPractices,
  filterPractices,
  hasLibraryFilters,
  isSearching,
  normalizeText,
  practiceCategories,
  practiceTypes,
  queryTokens,
  resultSummary,
  type LibraryFilters,
} from './practice-library';

function practice(id: string, over: Partial<Practice> = {}): Practice {
  return {
    id,
    title: id,
    description: null,
    contentType: 'audio',
    mediaUrl: null,
    thumbnailUrl: null,
    durationSeconds: 300,
    category: null,
    tags: [],
    difficulty: 1,
    progress: null,
    ...over,
  };
}

const library: Practice[] = [
  practice('a', {
    title: 'Grounding Breath',
    description: 'Slow the exhale to settle your body.',
    contentType: 'breathwork',
    category: 'GROUNDING',
    tags: ['calm', 'exhale'],
  }),
  practice('b', {
    title: 'Body Scan',
    description: 'A gentle tour of sensation.',
    contentType: 'meditation',
    category: 'EMBODIMENT',
  }),
  practice('c', {
    title: 'Café Reset',
    contentType: 'audio',
    category: 'REGULATION',
    tags: ['quick'],
  }),
  practice('d', { title: 'Open Awareness', contentType: 'meditation', category: 'EXPANSION' }),
  practice('e', { title: 'Uncategorised Movement', contentType: 'movement', category: null }),
];

const ids = (list: Practice[]) => list.map((p) => p.id);
const filters = (over: Partial<LibraryFilters>): LibraryFilters => ({ ...NO_FILTERS, ...over });

describe('query handling', () => {
  it('ignores case, accents and extra spaces', () => {
    expect(normalizeText('  CAFÉ   Reset ')).toBe('cafe reset');
    expect(queryTokens('  Calm   BREATH ')).toEqual(['calm', 'breath']);
    expect(queryTokens('   ')).toEqual([]);
  });

  it('labels a category for display without changing the stored value', () => {
    expect(categoryLabel('GROUNDING')).toBe('Grounding');
    expect(categoryLabel(' embodiment ')).toBe('Embodiment');
  });

  it('counts with the right plural', () => {
    expect(countLabel(1)).toBe('1 practice');
    expect(countLabel(0)).toBe('0 practices');
    expect(countLabel(12)).toBe('12 practices');
  });

  it('says how much of the library is showing', () => {
    expect(resultSummary(12, 12)).toBe('12 practices');
    expect(resultSummary(3, 12)).toBe('3 of 12 practices');
    expect(resultSummary(0, 12)).toBe('0 of 12 practices');
    expect(resultSummary(1, 1)).toBe('1 practice');
  });
});

describe('search', () => {
  it('returns everything for an empty query', () => {
    expect(filterPractices(library, NO_FILTERS)).toHaveLength(5);
  });

  it('finds a title, a description word, a tag, a category and a content type', () => {
    expect(ids(filterPractices(library, filters({ query: 'scan' })))).toEqual(['b']);
    expect(ids(filterPractices(library, filters({ query: 'exhale' })))).toEqual(['a']);
    expect(ids(filterPractices(library, filters({ query: 'quick' })))).toEqual(['c']);
    expect(ids(filterPractices(library, filters({ query: 'expansion' })))).toEqual(['d']);
    expect(ids(filterPractices(library, filters({ query: 'movement' })))).toEqual(['e']);
  });

  it('needs every word, in any order', () => {
    expect(ids(filterPractices(library, filters({ query: 'breath grounding' })))).toEqual(['a']);
    expect(filterPractices(library, filters({ query: 'breath scan' }))).toEqual([]);
  });

  it('matches without the accent', () => {
    expect(ids(filterPractices(library, filters({ query: 'cafe' })))).toEqual(['c']);
  });

  it('finds nothing for a word that is not there', () => {
    expect(filterPractices(library, filters({ query: 'zzz' }))).toEqual([]);
  });
});

describe('filters', () => {
  it('lists only the categories present, in the framework order, then any others', () => {
    expect(practiceCategories(library)).toEqual([
      'GROUNDING',
      'REGULATION',
      'EMBODIMENT',
      'EXPANSION',
    ]);
    const extra = [
      ...library,
      practice('x', { category: 'ZEN' }),
      practice('y', { category: 'ALPHA' }),
    ];
    expect(practiceCategories(extra).slice(-2)).toEqual(['ALPHA', 'ZEN']);
  });

  it('lists only the content types present, in a fixed order', () => {
    expect(practiceTypes(library)).toEqual(['audio', 'meditation', 'breathwork', 'movement']);
  });

  it('filters by category regardless of case', () => {
    expect(ids(filterPractices(library, filters({ category: 'grounding' })))).toEqual(['a']);
  });

  it('filters by content type', () => {
    expect(ids(filterPractices(library, filters({ type: 'meditation' })))).toEqual(['b', 'd']);
  });

  it('combines category, type and search: every active one must match', () => {
    expect(
      ids(filterPractices(library, filters({ type: 'meditation', category: 'EMBODIMENT' }))),
    ).toEqual(['b']);
    expect(
      filterPractices(library, filters({ type: 'meditation', category: 'GROUNDING' })),
    ).toEqual([]);
    expect(
      ids(filterPractices(library, filters({ type: 'meditation', query: 'awareness' }))),
    ).toEqual(['d']);
    expect(filterPractices(library, filters({ type: 'audio', query: 'scan' }))).toEqual([]);
  });

  it('reports whether a library filter or a search is active', () => {
    expect(hasLibraryFilters(NO_FILTERS)).toBe(false);
    expect(hasLibraryFilters(filters({ type: 'audio' }))).toBe(true);
    expect(hasLibraryFilters(filters({ query: 'x' }))).toBe(false);
    expect(isSearching(filters({ query: '  ' }))).toBe(false);
    expect(isSearching(filters({ query: 'x' }))).toBe(true);
  });
});

describe('guided practices in search', () => {
  const guided = [NINETY_SECOND_RESET, THE_EMPTY_CHAIR];

  it('keeps both when there is no query', () => {
    expect(filterGuidedPractices(guided, '')).toHaveLength(2);
  });

  it('finds each by title, subtitle or kind', () => {
    expect(filterGuidedPractices(guided, 'reset').map((g) => g.slug)).toEqual(['90-second-reset']);
    expect(filterGuidedPractices(guided, 'chair').map((g) => g.slug)).toEqual(['the-empty-chair']);
    expect(filterGuidedPractices(guided, 'guided reflection').map((g) => g.slug)).toEqual([
      'the-empty-chair',
    ]);
    expect(filterGuidedPractices(guided, 'guided')).toHaveLength(2);
  });

  it('returns none when nothing matches', () => {
    expect(filterGuidedPractices(guided, 'zzz')).toEqual([]);
  });
});
