import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * POST /api/v1/check-ins with phase-1 time zone recording: what is stored, what is returned, and
 * that nothing about which day a check-in belongs to changes. The database is replaced by a small
 * recorder, so this proves the route's own rules, not SQL.
 */
const state = vi.hoisted(() => ({
  existing: [] as Record<string, unknown>[],
  inserted: [] as Record<string, unknown>[],
}));

vi.mock('@/lib/auth-api', () => ({
  requireAuth: async () => ({ id: 'user-1' }),
}));

vi.mock('@tnsi/db', () => ({
  checkIns: { userId: 'userId', completedDate: 'completedDate' },
  db: {
    select: () => ({ from: () => ({ where: () => ({ limit: async () => state.existing }) }) }),
    insert: () => ({
      values: (values: Record<string, unknown>) => ({
        returning: async () => {
          state.inserted.push(values);
          return [{ id: 'new-id', createdAt: new Date(), ...values }];
        },
      }),
    }),
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
  state.existing = [];
  state.inserted = [];
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

  it('does not expose a previously recorded zone on the duplicate (400) path either', async () => {
    state.existing = [
      {
        id: 'old',
        moodScore: 3,
        capacityScore: 3,
        metadata: { timeZone: 'America/New_York', localDate: '2026-07-01', utcOffsetMinutes: -240 },
      },
    ];
    const res = await post({ moodScore: 3, capacityScore: 2, timeZone: 'Europe/London' });
    expect(res.status).toBe(400);
    const text = JSON.stringify(await res.json());
    expect(text).toContain('Check-in already exists for this date');
    expect(text).toContain('"id":"old"');
    expect(text).not.toContain('America/New_York');
    expect(state.inserted).toHaveLength(0);
  });

  it('still rejects genuinely invalid answers with the same validation error', async () => {
    const res = await post({ moodScore: 9, capacityScore: 2, timeZone: 'Europe/London' });
    expect(res.status).toBe(400);
    expect(state.inserted).toHaveLength(0);
  });
});
