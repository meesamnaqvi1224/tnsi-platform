import { describe, expect, it } from 'vitest';
import { practiceReflectionSchema, practiceCompletionSchema, practiceIdParam } from './validation';
import { shouldReuseCompletionRow, paginateRows } from './practice-sessions';

const VALID_COMPLETION_ID = '5b1e3c9a-2f0e-4b7a-9c1e-8f2a6d4b7c11';

describe('practiceIdParam (used by POST/DELETE .../[id]/save, among others)', () => {
  it('accepts a well-formed UUID', () => {
    const result = practiceIdParam.safeParse({ id: VALID_COMPLETION_ID });
    expect(result.success).toBe(true);
  });

  it('rejects a non-UUID string', () => {
    const result = practiceIdParam.safeParse({ id: 'not-a-real-id' });
    expect(result.success).toBe(false);
  });

  it('rejects an empty id', () => {
    const result = practiceIdParam.safeParse({ id: '' });
    expect(result.success).toBe(false);
  });

  it('rejects a missing id field entirely', () => {
    const result = practiceIdParam.safeParse({});
    expect(result.success).toBe(false);
  });
});

describe('practiceReflectionSchema', () => {
  it.each(['DIFFERENT', 'SAME', 'NOT_SURE'] as const)(
    'accepts the exact enum value %s',
    (response) => {
      const result = practiceReflectionSchema.safeParse({
        completionId: VALID_COMPLETION_ID,
        response,
      });
      expect(result.success).toBe(true);
      if (result.success) expect(result.data.response).toBe(response);
    },
  );

  it('rejects an invalid response value', () => {
    const result = practiceReflectionSchema.safeParse({
      completionId: VALID_COMPLETION_ID,
      response: 'HAPPY',
    });
    expect(result.success).toBe(false);
  });

  it('rejects a lowercase/free-form variant of a real value', () => {
    // The enum is deliberately exact-match, not case-insensitive or
    // interpreted - "different" is not "DIFFERENT".
    const result = practiceReflectionSchema.safeParse({
      completionId: VALID_COMPLETION_ID,
      response: 'different',
    });
    expect(result.success).toBe(false);
  });

  it('accepts an optional reflection with no response', () => {
    const result = practiceReflectionSchema.safeParse({
      completionId: VALID_COMPLETION_ID,
      reflection: 'Noticed my shoulders drop.',
    });
    expect(result.success).toBe(true);
  });

  it('accepts a response with no reflection text', () => {
    const result = practiceReflectionSchema.safeParse({
      completionId: VALID_COMPLETION_ID,
      response: 'SAME',
    });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.reflection).toBeUndefined();
  });

  it('accepts a payload with only a completionId - response/reflection stay optional', () => {
    const result = practiceReflectionSchema.safeParse({ completionId: VALID_COMPLETION_ID });
    expect(result.success).toBe(true);
  });

  it('rejects a payload missing completionId - a reflection must belong to a session', () => {
    const result = practiceReflectionSchema.safeParse({ response: 'SAME' });
    expect(result.success).toBe(false);
  });

  it('rejects a completionId that is not a valid UUID', () => {
    const result = practiceReflectionSchema.safeParse({
      completionId: 'not-a-uuid',
      response: 'SAME',
    });
    expect(result.success).toBe(false);
  });

  it('accepts both fields together', () => {
    const result = practiceReflectionSchema.safeParse({
      completionId: VALID_COMPLETION_ID,
      response: 'NOT_SURE',
      reflection: 'Hard to tell yet.',
    });
    expect(result.success).toBe(true);
  });

  it('rejects reflection text over the length limit', () => {
    const result = practiceReflectionSchema.safeParse({
      completionId: VALID_COMPLETION_ID,
      reflection: 'a'.repeat(2001),
    });
    expect(result.success).toBe(false);
  });

  it('accepts reflection text at exactly the length limit', () => {
    const result = practiceReflectionSchema.safeParse({
      completionId: VALID_COMPLETION_ID,
      reflection: 'a'.repeat(2000),
    });
    expect(result.success).toBe(true);
  });

  it('trims surrounding whitespace from reflection text', () => {
    const result = practiceReflectionSchema.safeParse({
      completionId: VALID_COMPLETION_ID,
      reflection: '  noticed calm  ',
    });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.reflection).toBe('noticed calm');
  });

  it('rejects a non-string reflection', () => {
    const result = practiceReflectionSchema.safeParse({
      completionId: VALID_COMPLETION_ID,
      reflection: 42,
    });
    expect(result.success).toBe(false);
  });

  it('rejects an unrelated payload shape entirely', () => {
    const result = practiceReflectionSchema.safeParse({ userId: 'someone-elses-id', score: 5 });
    // Unknown keys are ignored by a plain z.object(), but completionId is
    // still required and absent here, so this must fail.
    expect(result.success).toBe(false);
  });
});

describe('practiceCompletionSchema (regression - unchanged by this milestone)', () => {
  it('still accepts a full completion payload', () => {
    const result = practiceCompletionSchema.safeParse({
      progressPct: 1,
      positionSeconds: 300,
      completed: true,
      playCount: 2,
    });
    expect(result.success).toBe(true);
  });

  it('still accepts a partial progress-only payload', () => {
    const result = practiceCompletionSchema.safeParse({ progressPct: 0.4 });
    expect(result.success).toBe(true);
  });

  it('still rejects an out-of-range progressPct', () => {
    const result = practiceCompletionSchema.safeParse({ progressPct: 1.5 });
    expect(result.success).toBe(false);
  });

  it('still accepts an entirely empty payload', () => {
    const result = practiceCompletionSchema.safeParse({});
    expect(result.success).toBe(true);
  });
});

describe('shouldReuseCompletionRow', () => {
  const now = new Date('2026-09-16T12:00:00.000Z');
  const tenSecondsAgo = new Date(now.getTime() - 10_000);
  const oneMinuteAgo = new Date(now.getTime() - 60_000);
  const DUPLICATE_WINDOW_MS = 10_000;

  it('starts a new session when there is no prior row at all', () => {
    expect(shouldReuseCompletionRow(undefined, true, now, DUPLICATE_WINDOW_MS)).toBe(false);
    expect(shouldReuseCompletionRow(undefined, false, now, DUPLICATE_WINDOW_MS)).toBe(false);
  });

  it('reuses an in-progress row for a progress-only save', () => {
    const mostRecent = { completed: false, updatedAt: oneMinuteAgo };
    expect(shouldReuseCompletionRow(mostRecent, false, now, DUPLICATE_WINDOW_MS)).toBe(true);
  });

  it('reuses an in-progress row for the completion that finishes it', () => {
    const mostRecent = { completed: false, updatedAt: oneMinuteAgo };
    expect(shouldReuseCompletionRow(mostRecent, true, now, DUPLICATE_WINDOW_MS)).toBe(true);
  });

  it('starts a brand-new session (repeat practice) when the prior row is already completed and enough time has passed', () => {
    const mostRecent = { completed: true, updatedAt: oneMinuteAgo };
    expect(shouldReuseCompletionRow(mostRecent, true, now, DUPLICATE_WINDOW_MS)).toBe(false);
  });

  it('starts a brand-new session when the prior row is completed and this request is not a completion', () => {
    const mostRecent = { completed: true, updatedAt: tenSecondsAgo };
    expect(shouldReuseCompletionRow(mostRecent, false, now, DUPLICATE_WINDOW_MS)).toBe(false);
  });

  it('treats a completion within the duplicate window as a repeat submission, not a new session', () => {
    const justCompleted = new Date(now.getTime() - 1_000);
    const mostRecent = { completed: true, updatedAt: justCompleted };
    expect(shouldReuseCompletionRow(mostRecent, true, now, DUPLICATE_WINDOW_MS)).toBe(true);
  });

  it('treats a completion right at the duplicate window boundary as a new session (exclusive upper bound)', () => {
    const mostRecent = { completed: true, updatedAt: tenSecondsAgo };
    // now - updatedAt === DUPLICATE_WINDOW_MS exactly, and the check is `<`.
    expect(shouldReuseCompletionRow(mostRecent, true, now, DUPLICATE_WINDOW_MS)).toBe(false);
  });
});

describe('paginateRows', () => {
  it('returns hasMore: false when fewer rows than the limit were fetched', () => {
    const result = paginateRows([1, 2, 3], 20);
    expect(result.page).toEqual([1, 2, 3]);
    expect(result.hasMore).toBe(false);
  });

  it('returns hasMore: false when exactly `limit` rows were fetched', () => {
    const result = paginateRows([1, 2, 3], 3);
    expect(result.page).toEqual([1, 2, 3]);
    expect(result.hasMore).toBe(false);
  });

  it('slices off the lookahead row and reports hasMore: true when limit+1 rows were fetched', () => {
    const result = paginateRows([1, 2, 3], 2);
    expect(result.page).toEqual([1, 2]);
    expect(result.hasMore).toBe(true);
  });

  it('never duplicates or drops rows across a full page/lookahead boundary', () => {
    const rows = Array.from({ length: 21 }, (_, i) => i);
    const result = paginateRows(rows, 20);
    expect(result.page).toHaveLength(20);
    expect(result.page).toEqual(rows.slice(0, 20));
    expect(result.hasMore).toBe(true);
  });

  it('handles an empty result set', () => {
    const result = paginateRows([], 20);
    expect(result.page).toEqual([]);
    expect(result.hasMore).toBe(false);
  });
});
