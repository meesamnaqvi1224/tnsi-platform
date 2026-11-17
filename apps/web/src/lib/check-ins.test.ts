import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * recordCheckIn decides primary vs additional. The database is mocked here, so this proves the
 * decision logic (which insert is tried, what is returned), not the SQL: the partial unique index
 * and ON CONFLICT behaviour are proven by running the migration on an isolated database, see
 * docs/multiple-daily-check-ins-migration.md.
 */
const inserts: { values: Record<string, unknown>; conflictGuarded: boolean }[] = [];
let primaryClaimResult: unknown[] = [];

vi.mock('@tnsi/db', () => {
  const makeInsert = () => {
    const call = { values: {} as Record<string, unknown>, conflictGuarded: false };
    inserts.push(call);
    const chain = {
      values: (v: Record<string, unknown>) => {
        call.values = v;
        return chain;
      },
      onConflictDoNothing: () => {
        call.conflictGuarded = true;
        return chain;
      },
      returning: async () =>
        call.conflictGuarded ? primaryClaimResult : [{ ...call.values, id: 'row' }],
    };
    return chain;
  };
  return {
    db: { insert: makeInsert },
    checkIns: { userId: 'userId', completedDate: 'completedDate', isPrimary: 'isPrimary' },
  };
});

import { localDayOf, recordCheckIn } from './check-ins';

beforeEach(() => {
  inserts.length = 0;
  primaryClaimResult = [];
});

describe('localDayOf', () => {
  it('drops the time of day, keeping the local calendar day', () => {
    const day = localDayOf(new Date(2026, 10, 9, 22, 45, 10));
    expect(day).toEqual(new Date(2026, 10, 9));
  });
});

describe('recordCheckIn', () => {
  const input = {
    moodScore: 3,
    capacityScore: 2,
    notes: 'ok',
    completedAt: new Date(2026, 10, 9, 8, 0),
  };

  it("saves the day's first check-in as the primary, with a single guarded insert", async () => {
    primaryClaimResult = [{ id: 'p1', isPrimary: true }];
    const saved = await recordCheckIn('u1', input);
    expect(saved).toEqual({ id: 'p1', isPrimary: true });
    expect(inserts).toHaveLength(1);
    expect(inserts[0]!.conflictGuarded).toBe(true);
    expect(inserts[0]!.values).toMatchObject({ userId: 'u1', isPrimary: true, capacityScore: 2 });
  });

  it('saves a later check-in the same day as an additional record, never touching the primary', async () => {
    primaryClaimResult = []; // a primary already exists: the guarded insert does nothing
    const saved = await recordCheckIn('u1', input);
    expect(inserts).toHaveLength(2);
    expect(inserts[1]!.conflictGuarded).toBe(false);
    expect(inserts[1]!.values).toMatchObject({ userId: 'u1', isPrimary: false, moodScore: 3 });
    expect(saved).toMatchObject({ isPrimary: false });
  });

  it('keeps the same day on both attempts', async () => {
    primaryClaimResult = [];
    await recordCheckIn('u1', input);
    expect(inserts[0]!.values.completedDate).toEqual(inserts[1]!.values.completedDate);
    expect(inserts[0]!.values.completedDate).toEqual(new Date(2026, 10, 9));
  });

  it('stores the same metadata on the primary and on an additional record, and {} when none is given', async () => {
    const metadata = { timeZone: 'Europe/London', localDate: '2026-11-09', utcOffsetMinutes: 0 };
    primaryClaimResult = [{ id: 'p1', isPrimary: true }];
    await recordCheckIn('u1', { ...input, metadata });
    expect(inserts[0]!.values.metadata).toEqual(metadata);

    inserts.length = 0;
    primaryClaimResult = []; // a primary already exists, so this one is additional
    await recordCheckIn('u1', { ...input, metadata });
    expect(inserts[0]!.values.metadata).toEqual(metadata);
    expect(inserts[1]!.values.metadata).toEqual(metadata);

    inserts.length = 0;
    await recordCheckIn('u1', input); // an older client: no metadata
    expect(inserts[0]!.values.metadata).toEqual({});
    expect(inserts[1]!.values.metadata).toEqual({});
  });
});
