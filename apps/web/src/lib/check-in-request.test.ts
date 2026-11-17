import { afterEach, describe, expect, it, vi } from 'vitest';
import { browserTimeZone, buildCheckInBody } from './check-in-request';

afterEach(() => vi.restoreAllMocks());

describe('buildCheckInBody (web form payload)', () => {
  it('sends only the time zone identifier alongside the answers', () => {
    expect(
      buildCheckInBody({ moodScore: 3, capacityScore: 2, notes: 'ok' }, 'Europe/London'),
    ).toEqual({ moodScore: 3, capacityScore: 2, notes: 'ok', timeZone: 'Europe/London' });
  });

  it('omits the time zone entirely when unknown, leaving the old payload', () => {
    const body = buildCheckInBody({ moodScore: 3, capacityScore: 2 }, undefined);
    expect(Object.keys(body)).not.toContain('timeZone');
    expect(body).toMatchObject({ moodScore: 3, capacityScore: 2 });
  });

  it('never sends a derived date or offset', () => {
    const keys = Object.keys(buildCheckInBody({ moodScore: 1, capacityScore: 1 }, 'Asia/Kolkata'));
    expect(keys).not.toContain('localDate');
    expect(keys).not.toContain('utcOffsetMinutes');
  });

  it('browserTimeZone never throws', () => {
    vi.spyOn(Intl, 'DateTimeFormat').mockImplementation(() => {
      throw new Error('no Intl');
    });
    expect(browserTimeZone()).toBeUndefined();
  });
});
