import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * POST /api/v1/check-ins with phase-1 time zone recording: what is stored, what is returned, and
 * that nothing about which day a check-in belongs to changes. The database is replaced by a small
 * recorder, so this proves the route's own rules, not SQL.
 */
const state = vi.hoisted(() => ({
  /** Whether a primary check-in already exists for the day (the guarded insert then does nothing). */
  primaryExists: false,
  inserted: [] as Record<string, unknown>[],
  /** How many times the suggested ids were merged into a saved row's metadata. */
  updates: 0,
}));

vi.mock('@/lib/auth-api', () => ({
  requireAuth: async () => ({ id: 'user-1' }),
}));

// The suggestions are only recorded when every check-in drives them (the follow-up switch); these tests
// run with it off, and the recording has its own tests.
vi.mock('@/lib/practices', () => ({
  getRecommendedPractices: async () => ({
    primary: { id: 'practice-a' },
    alternative: { id: 'practice-b' },
    condition: null,
  }),
}));
vi.mock('@/lib/het-suggestions', () => ({
  getHetSuggestions: async (_u: string, o: { surface?: string }) => ({
    condition: null,
    items: [{ id: o.surface === 'web' ? 'card-web' : 'card-app' }],
  }),
}));
vi.mock('@/lib/membership', () => ({
  contentAccessFor: () => ({ gatingActive: false, membership: { hasPaidAccess: true } }),
}));

vi.mock('@tnsi/db', () => ({
  checkIns: { userId: 'userId', completedDate: 'completedDate', isPrimary: 'isPrimary' },
  db: {
    update: () => {
      const chain = {
        set: () => chain,
        where: async () => {
          state.updates += 1;
        },
      };
      return chain;
    },
    insert: () => {
      let values: Record<string, unknown> = {};
      let guarded = false;
      const chain = {
        values: (v: Record<string, unknown>) => {
          values = v;
          return chain;
        },
        onConflictDoNothing: () => {
          guarded = true;
          return chain;
        },
        returning: async () => {
          if (guarded && state.primaryExists) return []; // a primary already exists: nothing inserted
          state.inserted.push(values);
          return [{ id: `row-${state.inserted.length}`, createdAt: new Date(), ...values }];
        },
      };
      return chain;
    },
  },
}));

const { POST } = await import('./route');

const AT = '2026-07-01T23:30:00.000Z';

function post(body: Record<string, unknown>) {
  return POST(
    new Request('http://x/api/v1/check-ins', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    }),
  );
}

beforeEach(() => {
  state.primaryExists = false;
  state.inserted = [];
  state.updates = 0;
  vi.restoreAllMocks();
});

describe('POST /api/v1/check-ins: time zone recording', () => {
  it('stores the validated zone with the server-computed local date and offset', async () => {
    const res = await post({
      moodScore: 3,
      capacityScore: 2,
      completedAt: AT,
      timeZone: 'Europe/London',
    });
    expect(res.status).toBe(201);
    expect(state.inserted[0]!.metadata).toEqual({
      timeZone: 'Europe/London',
      localDate: '2026-07-02',
      utcOffsetMinutes: 60,
    });
  });

  it('ignores a client-supplied local date or offset: only the identifier counts', async () => {
    await post({
      moodScore: 3,
      capacityScore: 2,
      completedAt: AT,
      timeZone: 'Europe/London',
      localDate: '1999-01-01',
      utcOffsetMinutes: 999,
    });
    expect(state.inserted[0]!.metadata).toEqual({
      timeZone: 'Europe/London',
      localDate: '2026-07-02',
      utcOffsetMinutes: 60,
    });
  });

  it.each([
    ['missing', {}],
    ['unknown zone', { timeZone: 'Mars/Olympus_Mons' }],
    ['wrong shape', { timeZone: 'London' }],
    ['injection style', { timeZone: "x'; DROP TABLE check_ins;--" }],
    ['not a string', { timeZone: 42 }],
    ['an object', { timeZone: { zone: 'UTC' } }],
    ['empty', { timeZone: '' }],
  ])('still saves the check-in when the zone is %s, recording no time zone', async (_l, extra) => {
    const res = await post({ moodScore: 3, capacityScore: 2, completedAt: AT, ...extra });
    expect(res.status).toBe(201);
    expect(state.inserted).toHaveLength(1);
    expect(state.inserted[0]!.metadata).toEqual({});
  });

  it('logs a rejected zone but says nothing when none was sent', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    await post({ moodScore: 3, capacityScore: 2, timeZone: 'Nowhere/Land' });
    expect(warn).toHaveBeenCalledTimes(1);
    warn.mockClear();
    await post({ moodScore: 3, capacityScore: 2 });
    expect(warn).not.toHaveBeenCalled();
  });

  it('does not change completed_date: identical with, without and with a bad zone', async () => {
    await post({ moodScore: 3, capacityScore: 2, completedAt: AT });
    await post({ moodScore: 3, capacityScore: 2, completedAt: AT, timeZone: 'Pacific/Kiritimati' });
    await post({ moodScore: 3, capacityScore: 2, completedAt: AT, timeZone: 'Nowhere/Land' });
    const dates = state.inserted.map((row) => (row.completedDate as Date).getTime());
    expect(new Set(dates).size).toBe(1);
    // ...and it is still the server-local calendar day of the instant, exactly as before.
    const at = new Date(AT);
    expect(dates[0]).toBe(new Date(at.getFullYear(), at.getMonth(), at.getDate()).getTime());
  });

  it('keeps every other stored field exactly as before', async () => {
    await post({
      moodScore: 4,
      capacityScore: 5,
      notes: 'n',
      completedAt: AT,
      timeZone: 'Asia/Kolkata',
    });
    expect(state.inserted[0]).toMatchObject({
      userId: 'user-1',
      moodScore: 4,
      capacityScore: 5,
      notes: 'n',
      completedAt: new Date(AT),
    });
  });

  it('never exposes timezone information in the response', async () => {
    const res = await post({
      moodScore: 3,
      capacityScore: 2,
      completedAt: AT,
      timeZone: 'Europe/London',
    });
    const text = JSON.stringify(await res.json());
    expect(text).not.toContain('Europe/London');
    expect(text).not.toContain('localDate');
    expect(text).not.toContain('utcOffsetMinutes');
    expect(text).toContain('"metadata":{}');
  });

  it('stores the same time zone metadata on an additional check-in as on the primary', async () => {
    const body = { moodScore: 3, capacityScore: 2, completedAt: AT, timeZone: 'Europe/London' };
    await post(body); // primary
    state.primaryExists = true;
    const res = await post({ ...body, capacityScore: 5 }); // additional, same day
    expect(res.status).toBe(201);
    expect(state.inserted).toHaveLength(2);
    expect(state.inserted[0]).toMatchObject({ isPrimary: true });
    expect(state.inserted[1]).toMatchObject({ isPrimary: false, capacityScore: 5 });
    expect(state.inserted[1]!.metadata).toEqual(state.inserted[0]!.metadata);
    expect(state.inserted[1]!.metadata).toEqual({
      timeZone: 'Europe/London',
      localDate: '2026-07-02',
      utcOffsetMinutes: 60,
    });
  });

  it('an additional check-in without a usable zone is still saved, without time zone data', async () => {
    state.primaryExists = true;
    for (const extra of [{}, { timeZone: 'Nowhere/Land' }, { timeZone: 42 }]) {
      const res = await post({ moodScore: 3, capacityScore: 2, completedAt: AT, ...extra });
      expect(res.status).toBe(201);
    }
    expect(state.inserted).toHaveLength(3);
    expect(state.inserted.every((row) => row.isPrimary === false)).toBe(true);
    expect(state.inserted.every((row) => JSON.stringify(row.metadata) === '{}')).toBe(true);
  });

  it('a client that sends no time zone at all (an older build) works exactly as before', async () => {
    const res = await post({ moodScore: 3, capacityScore: 2 });
    expect(res.status).toBe(201);
    expect(state.inserted[0]).toMatchObject({ userId: 'user-1', moodScore: 3, isPrimary: true });
    expect(state.inserted[0]!.metadata).toEqual({});
  });

  it('never exposes timezone information on an additional check-in response either', async () => {
    state.primaryExists = true;
    const res = await post({
      moodScore: 3,
      capacityScore: 2,
      completedAt: AT,
      timeZone: 'Europe/London',
    });
    const text = JSON.stringify(await res.json());
    expect(text).not.toContain('Europe/London');
    expect(text).not.toContain('localDate');
    expect(text).toContain('"metadata":{}');
  });

  it('still rejects genuinely invalid answers with the same validation error', async () => {
    const res = await post({ moodScore: 9, capacityScore: 2, timeZone: 'Europe/London' });
    expect(res.status).toBe(400);
    expect(state.inserted).toHaveLength(0);
  });
});

describe('POST /api/v1/check-ins: follow-up answer', () => {
  const pattern = { v: 1, path: 'pattern', pattern: 'functional-overdrive' };
  afterEach(() => vi.unstubAllEnvs());

  it('is ignored and not stored while the feature is off (the default)', async () => {
    const res = await post({ moodScore: 2, capacityScore: 2, followUp: pattern });
    expect(res.status).toBe(201);
    expect(state.inserted[0]!.metadata).toEqual({});
  });

  it('is stored as ids in metadata when the feature is on, next to the time zone', async () => {
    vi.stubEnv('CHECKIN_FOLLOW_UP_ENABLED', 'true');
    const res = await post({
      moodScore: 2,
      capacityScore: 2,
      completedAt: AT,
      timeZone: 'Europe/London',
      followUp: pattern,
    });
    expect(res.status).toBe(201);
    expect(state.inserted[0]!.metadata).toMatchObject({
      timeZone: 'Europe/London',
      followUp: pattern,
    });
  });

  it('never returns the answer', async () => {
    vi.stubEnv('CHECKIN_FOLLOW_UP_ENABLED', 'true');
    const res = await post({ moodScore: 2, capacityScore: 2, followUp: pattern });
    const text = JSON.stringify(await res.json());
    expect(text).not.toContain('functional-overdrive');
    expect(text).toContain('"metadata":{}');
  });

  it('keeps only the allowed fields of a valid answer', async () => {
    vi.stubEnv('CHECKIN_FOLLOW_UP_ENABLED', 'true');
    await post({
      moodScore: 4,
      capacityScore: 4,
      followUp: { v: 1, path: 'grow', growArea: 'participation', notes: 'free text', extra: 1 },
    });
    expect(state.inserted[0]!.metadata).toEqual({
      followUp: { v: 1, path: 'grow', growArea: 'participation' },
    });
  });

  it('drops a malformed or out-of-place answer but still saves the check-in', async () => {
    vi.stubEnv('CHECKIN_FOLLOW_UP_ENABLED', 'true');
    for (const [capacityScore, followUp] of [
      [2, { v: 1, path: 'pattern', pattern: 'stretch' }],
      [2, { v: 1, path: 'grow', growArea: 'expansion' }], // grow needs 3 or higher
      [5, pattern], // a settle answer needs 3 or lower
      [2, 'nonsense'],
      [2, 42],
    ] as const) {
      state.inserted = [];
      const res = await post({ moodScore: capacityScore, capacityScore, followUp });
      expect(res.status).toBe(201);
      expect(state.inserted[0]!.metadata).toEqual({});
    }
  });

  it('a client that sends no answer (an older build) works exactly as before', async () => {
    vi.stubEnv('CHECKIN_FOLLOW_UP_ENABLED', 'true');
    const res = await post({ moodScore: 3, capacityScore: 2 });
    expect(res.status).toBe(201);
    expect(state.inserted[0]!.metadata).toEqual({});
  });
});

describe('POST /api/v1/check-ins: remembering what was suggested', () => {
  afterEach(() => vi.unstubAllEnvs());

  it('stores nothing extra while the switch is off', async () => {
    const res = await post({ moodScore: 3, capacityScore: 3 });
    expect(res.status).toBe(201);
    expect(state.updates).toBe(0);
  });

  it('records the suggested ids once when every check-in drives, and still answers 201', async () => {
    vi.stubEnv('CHECKIN_FOLLOW_UP_ENABLED', 'true');
    const res = await post({ moodScore: 3, capacityScore: 3 });
    expect(res.status).toBe(201);
    expect(state.updates).toBe(1);
  });

  it('records it for an additional check-in too', async () => {
    vi.stubEnv('CHECKIN_FOLLOW_UP_ENABLED', 'true');
    state.primaryExists = true;
    const res = await post({ moodScore: 3, capacityScore: 4 });
    expect(res.status).toBe(201);
    expect(state.inserted[0]!.isPrimary).toBe(false);
    expect(state.updates).toBe(1);
  });
});
