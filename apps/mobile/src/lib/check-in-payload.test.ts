import { afterEach, describe, expect, it, vi } from 'vitest';
import { buildCheckInPayload, deviceTimeZone } from './check-in-payload';

afterEach(() => vi.restoreAllMocks());

describe('buildCheckInPayload', () => {
  it('sends only the time zone identifier alongside the answer', () => {
    expect(buildCheckInPayload(3, 'Europe/London')).toEqual({
      moodScore: 3,
      capacityScore: 3,
      timeZone: 'Europe/London',
    });
  });

  it('is exactly the old payload when no time zone is known', () => {
    expect(buildCheckInPayload(4, undefined)).toEqual({ moodScore: 4, capacityScore: 4 });
    expect(Object.keys(buildCheckInPayload(4, undefined))).not.toContain('timeZone');
  });

  it('never sends a derived date or offset', () => {
    const keys = Object.keys(buildCheckInPayload(2, 'Asia/Kolkata'));
    expect(keys.sort()).toEqual(['capacityScore', 'moodScore', 'timeZone']);
  });
});

describe('deviceTimeZone', () => {
  it('returns the runtime zone as a non-empty string (or undefined)', () => {
    const zone = deviceTimeZone();
    expect(zone === undefined || (typeof zone === 'string' && zone.length > 0)).toBe(true);
  });

  it('returns undefined instead of throwing when the runtime cannot say', () => {
    vi.spyOn(Intl, 'DateTimeFormat').mockImplementation(() => {
      throw new Error('no Intl');
    });
    expect(deviceTimeZone()).toBeUndefined();
    expect(buildCheckInPayload(3, deviceTimeZone())).toEqual({ moodScore: 3, capacityScore: 3 });
  });
});
