import { describe, expect, it } from 'vitest';
import {
  buildMilestones,
  checkInJourneyLabel,
  formatJourneyDate,
  formatJourneyDayLabel,
  groupJourneyByMonth,
  groupJourneyEntriesByDate,
  mapJourneyRow,
  mergeMilestones,
  truncateReflection,
  type CheckInJourneyEntry,
  type JourneyRawRow,
  type JourneyReflection,
  type MilestoneItem,
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

describe('buildMilestones', () => {
  const DAY = 24 * 60 * 60 * 1000;
  const now = new Date('2026-11-03T12:00:00Z');

  it('makes a marker for each first thing the member has actually done, and nothing else', () => {
    const items = buildMilestones(
      {
        firstCheckIn: new Date('2026-10-29T08:00:00Z'),
        firstPractice: null,
        firstReflection: null,
      },
      now,
    );
    expect(items.map((item) => item.key)).toEqual(['first_check_in']);
  });

  it('adds "one month since you began" only once thirty days have passed since the earliest activity', () => {
    const early = new Date(now.getTime() - 29 * DAY);
    expect(
      buildMilestones({ firstCheckIn: early, firstPractice: null, firstReflection: null }, now),
    ).toHaveLength(1);
    const older = new Date(now.getTime() - 31 * DAY);
    const items = buildMilestones(
      {
        firstCheckIn: older,
        firstPractice: new Date(now.getTime() - 5 * DAY),
        firstReflection: null,
      },
      now,
    );
    const month = items.find((item) => item.key === 'one_month');
    expect(month?.occurredAt.getTime()).toBe(older.getTime() + 30 * DAY);
  });

  it('is empty for a member who has done nothing', () => {
    expect(
      buildMilestones({ firstCheckIn: null, firstPractice: null, firstReflection: null }, now),
    ).toEqual([]);
  });
});

describe('mergeMilestones', () => {
  const checkIn = (id: string, iso: string): CheckInJourneyEntry => ({
    kind: 'check_in',
    id,
    occurredAt: new Date(iso),
    moodScore: 3,
    capacityScore: 3,
    notes: null,
  });
  const marker = (key: MilestoneItem['key'], iso: string): MilestoneItem => ({
    kind: 'milestone',
    id: `milestone-${key}`,
    occurredAt: new Date(iso),
    key,
    label: key,
  });
  const entries = [checkIn('a', '2026-10-30T10:00:00Z'), checkIn('b', '2026-10-20T10:00:00Z')];

  it('puts a marker at the same moment just after the entry that caused it', () => {
    const merged = mergeMilestones(entries, [marker('first_check_in', '2026-10-20T10:00:00Z')], {
      isFirstPage: true,
      hasMore: false,
    });
    expect(merged.map((item) => item.id)).toEqual(['a', 'b', 'milestone-first_check_in']);
  });

  it('keeps only the markers inside the dates a middle page covers', () => {
    const markers = [
      marker('first_practice', '2026-11-01T00:00:00Z'),
      marker('first_reflection', '2026-10-25T00:00:00Z'),
      marker('one_month', '2026-09-01T00:00:00Z'),
    ];
    const merged = mergeMilestones(entries, markers, { isFirstPage: false, hasMore: true });
    expect(merged.map((item) => item.id)).toEqual(['a', 'milestone-first_reflection', 'b']);
  });

  it('shows markers newer than the page on the first page, and older ones on the last page', () => {
    const markers = [
      marker('first_practice', '2026-11-01T00:00:00Z'),
      marker('one_month', '2026-09-01T00:00:00Z'),
    ];
    expect(
      mergeMilestones(entries, markers, { isFirstPage: true, hasMore: true }).map((i) => i.id),
    ).toEqual(['milestone-first_practice', 'a', 'b']);
    expect(
      mergeMilestones(entries, markers, { isFirstPage: false, hasMore: false }).map((i) => i.id),
    ).toEqual(['a', 'b', 'milestone-one_month']);
  });

  it('shows nothing when the page has no entries', () => {
    expect(
      mergeMilestones([], [marker('first_practice', '2026-10-01T00:00:00Z')], {
        isFirstPage: true,
        hasMore: false,
      }),
    ).toEqual([]);
  });
});

describe('formatJourneyDayLabel', () => {
  const now = new Date('2026-11-03T12:00:00Z');

  it('reads Today, Yesterday with the weekday, and otherwise weekday and date', () => {
    expect(formatJourneyDayLabel(new Date('2026-11-03T09:00:00Z'), now)).toBe('Today');
    expect(formatJourneyDayLabel(new Date('2026-11-02T09:00:00Z'), now)).toBe('Yesterday · Monday');
    expect(formatJourneyDayLabel(new Date('2026-10-29T09:00:00Z'), now)).toBe('Thursday 29 Oct');
  });

  it('adds the year only when it is not this year', () => {
    expect(formatJourneyDayLabel(new Date('2025-12-24T09:00:00Z'), now)).toBe(
      'Wednesday 24 Dec 2025',
    );
  });
});

describe('groupJourneyByMonth', () => {
  it('groups newest-first items under month and year without re-sorting', () => {
    const items = [
      { occurredAt: new Date('2026-11-02T10:00:00') },
      { occurredAt: new Date('2026-10-29T10:00:00') },
      { occurredAt: new Date('2026-10-02T10:00:00') },
      { occurredAt: new Date('2025-10-02T10:00:00') },
    ];
    const months = groupJourneyByMonth(items);
    expect(months.map((m) => m.label)).toEqual(['November 2026', 'October 2026', 'October 2025']);
    expect(months[1]!.items).toHaveLength(2);
  });
});
