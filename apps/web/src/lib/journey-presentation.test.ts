import { describe, expect, it } from 'vitest';
import {
  checkInJourneyLabel,
  formatJourneyDate,
  groupJourneyEntriesByDate,
  mapJourneyRow,
  truncateReflection,
  type CheckInJourneyEntry,
  type JourneyRawRow,
  type JourneyReflection,
} from './journey-presentation';

// Constructed from local (not UTC) components deliberately - formatJourneyDate
// compares calendar days in local time, so a fixed UTC instant near midnight
// would flip "today" vs "tomorrow" depending on the machine's own timezone.
const NOW = new Date(2026, 8, 16, 12, 0, 0);

function practiceRow(overrides: Partial<JourneyRawRow> = {}): JourneyRawRow {
  return {
    kind: 'practice',
    entryId: 'completion-1',
    occurredAt: new Date(2026, 8, 16, 9, 0, 0),
    practiceId: 'practice-1',
    practiceTitle: 'Grounding PowerDrop',
    practiceContentType: 'breathwork',
    practiceCategory: 'Grounding',
    practiceDurationSeconds: 300,
    moodScore: null,
    capacityScore: null,
    notes: null,
    ...overrides,
  };
}

function checkInRow(overrides: Partial<JourneyRawRow> = {}): JourneyRawRow {
  return {
    kind: 'check_in',
    entryId: 'check-in-1',
    occurredAt: new Date(2026, 8, 16, 8, 0, 0),
    practiceId: null,
    practiceTitle: null,
    practiceContentType: null,
    practiceCategory: null,
    practiceDurationSeconds: null,
    moodScore: 4,
    capacityScore: 4,
    notes: null,
    ...overrides,
  };
}

describe('mapJourneyRow', () => {
  it('maps a practice row with a reflection attached by completionId', () => {
    const row = practiceRow();
    const reflections = new Map<string, JourneyReflection>([
      ['completion-1', { response: 'DIFFERENT', reflection: 'Noticed my shoulders drop.' }],
    ]);
    const entry = mapJourneyRow(row, reflections);
    expect(entry).toEqual({
      kind: 'practice',
      id: 'completion-1',
      occurredAt: row.occurredAt,
      practiceId: 'practice-1',
      title: 'Grounding PowerDrop',
      contentType: 'breathwork',
      category: 'Grounding',
      durationSeconds: 300,
      reflection: { response: 'DIFFERENT', reflection: 'Noticed my shoulders drop.' },
    });
  });

  it('maps a practice row with no reflection to reflection: null, not an empty placeholder object', () => {
    const entry = mapJourneyRow(practiceRow(), new Map());
    expect(entry.kind).toBe('practice');
    if (entry.kind === 'practice') expect(entry.reflection).toBeNull();
  });

  it('maps a practice row with missing duration/category without breaking', () => {
    const row = practiceRow({ practiceDurationSeconds: null, practiceCategory: null });
    const entry = mapJourneyRow(row, new Map());
    expect(entry.kind).toBe('practice');
    if (entry.kind === 'practice') {
      expect(entry.durationSeconds).toBeNull();
      expect(entry.category).toBeNull();
    }
  });

  it('never attaches a reflection keyed to a different completionId', () => {
    const reflections = new Map<string, JourneyReflection>([
      ['some-other-completion', { response: 'SAME', reflection: null }],
    ]);
    const entry = mapJourneyRow(practiceRow(), reflections);
    expect(entry.kind).toBe('practice');
    if (entry.kind === 'practice') expect(entry.reflection).toBeNull();
  });

  it('maps a check-in row', () => {
    const entry = mapJourneyRow(checkInRow(), new Map());
    expect(entry).toEqual({
      kind: 'check_in',
      id: 'check-in-1',
      occurredAt: checkInRow().occurredAt,
      moodScore: 4,
      capacityScore: 4,
      notes: null,
    });
  });

  it('output contains only source fields and presentation labels - no derived clinical/progress values', () => {
    const entry = mapJourneyRow(practiceRow(), new Map());
    const keys = Object.keys(entry).sort();
    expect(keys).toEqual(
      [
        'category',
        'contentType',
        'durationSeconds',
        'id',
        'kind',
        'occurredAt',
        'practiceId',
        'reflection',
        'title',
      ].sort(),
    );
  });
});

describe('formatJourneyDate', () => {
  it('labels the same calendar day as Today', () => {
    expect(formatJourneyDate(new Date(2026, 8, 16, 23, 0, 0), NOW)).toBe('Today');
  });

  it('labels the previous calendar day as Yesterday', () => {
    expect(formatJourneyDate(new Date(2026, 8, 15, 1, 0, 0), NOW)).toBe('Yesterday');
  });

  it('labels an older date with a short day/month format', () => {
    expect(formatJourneyDate(new Date(2026, 8, 14, 12, 0, 0), NOW)).toBe('14 Sept');
  });
});

describe('groupJourneyEntriesByDate', () => {
  it('groups same-day entries together, preserving order', () => {
    const entries = [
      mapJourneyRow(
        practiceRow({ entryId: 'a', occurredAt: new Date(2026, 8, 16, 10, 0, 0) }),
        new Map(),
      ),
      mapJourneyRow(
        checkInRow({ entryId: 'b', occurredAt: new Date(2026, 8, 16, 8, 0, 0) }),
        new Map(),
      ),
      mapJourneyRow(
        practiceRow({ entryId: 'c', occurredAt: new Date(2026, 8, 15, 10, 0, 0) }),
        new Map(),
      ),
    ];
    const groups = groupJourneyEntriesByDate(entries, NOW);
    expect(groups).toHaveLength(2);
    expect(groups[0]!.label).toBe('Today');
    expect(groups[0]!.entries.map((e) => e.id)).toEqual(['a', 'b']);
    expect(groups[1]!.label).toBe('Yesterday');
    expect(groups[1]!.entries.map((e) => e.id)).toEqual(['c']);
  });

  it('never merges two different years that share a day/month label', () => {
    const entries = [
      mapJourneyRow(
        practiceRow({ entryId: 'this-year', occurredAt: new Date(2026, 0, 5, 10, 0, 0) }),
        new Map(),
      ),
      mapJourneyRow(
        practiceRow({ entryId: 'last-year', occurredAt: new Date(2025, 0, 5, 10, 0, 0) }),
        new Map(),
      ),
    ];
    const groups = groupJourneyEntriesByDate(entries, NOW);
    expect(groups).toHaveLength(2);
  });

  it('returns an empty array for an empty entry list', () => {
    expect(groupJourneyEntriesByDate([], NOW)).toEqual([]);
  });
});

describe('checkInJourneyLabel', () => {
  it('returns the plain-language label when mood and capacity match (the single-question flow)', () => {
    const entry: CheckInJourneyEntry = {
      kind: 'check_in',
      id: '1',
      occurredAt: NOW,
      moodScore: 4,
      capacityScore: 4,
      notes: null,
    };
    expect(checkInJourneyLabel(entry)).toBe("I'm feeling good");
  });

  it('returns null for a legacy check-in with differing mood/capacity, rather than inventing a label', () => {
    const entry: CheckInJourneyEntry = {
      kind: 'check_in',
      id: '1',
      occurredAt: NOW,
      moodScore: 2,
      capacityScore: 4,
      notes: null,
    };
    expect(checkInJourneyLabel(entry)).toBeNull();
  });
});

describe('truncateReflection', () => {
  it('returns short text unchanged', () => {
    expect(truncateReflection('Noticed calm.')).toBe('Noticed calm.');
  });

  it('truncates long text to the max length with an ellipsis', () => {
    const text = 'a'.repeat(200);
    const result = truncateReflection(text, 140);
    expect(result.length).toBeLessThanOrEqual(141);
    expect(result.endsWith('…')).toBe(true);
  });

  it('truncates on a word boundary when one is reasonably close to the limit, never mid-word', () => {
    const text = `${'word '.repeat(30)}overflow`;
    const result = truncateReflection(text, 140);
    // Every token in the source is the whole word "word" (the only other
    // token, "overflow", never appears at all if the cut landed cleanly) -
    // so the text right before the ellipsis must be a complete "word", not
    // a partial fragment like "wor" that a naive hard cut would produce.
    expect(result).toBe(`${'word '.repeat(28).trimEnd()}…`);
  });
});
