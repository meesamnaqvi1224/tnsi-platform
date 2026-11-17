import { describe, expect, it, vi } from 'vitest';

vi.mock('@tnsi/db', () => ({ db: {}, checkIns: {} }));
const { toPublicCheckIn } = await import('./check-ins');

describe('toPublicCheckIn', () => {
  it('replaces metadata with the empty object and leaves every other field alone', () => {
    const row = {
      id: 'a',
      moodScore: 3,
      notes: null,
      metadata: { timeZone: 'Europe/London', localDate: '2026-07-02', utcOffsetMinutes: 60 },
    };
    const out = toPublicCheckIn(row);
    expect(out).toEqual({ id: 'a', moodScore: 3, notes: null, metadata: {} });
    expect(JSON.stringify(out)).not.toContain('Europe/London');
  });

  it('does not mutate the row it was given', () => {
    const row = { metadata: { timeZone: 'UTC' } };
    toPublicCheckIn(row);
    expect(row.metadata).toEqual({ timeZone: 'UTC' });
  });
});
