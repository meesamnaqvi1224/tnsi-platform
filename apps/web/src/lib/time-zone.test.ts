import { describe, expect, it } from 'vitest';
import {
  buildTimeZoneMetadata,
  describeRejectedTimeZone,
  localDateIn,
  utcOffsetMinutesAt,
  validateTimeZone,
} from './time-zone';

describe('validateTimeZone', () => {
  it.each(['Europe/London', 'America/New_York', 'Asia/Kolkata', 'Pacific/Kiritimati', 'UTC'])(
    'accepts %s',
    (zone) => {
      expect(validateTimeZone(zone)).toEqual(expect.any(String));
    },
  );

  it('accepts an alias and returns a canonical name that is itself valid', () => {
    const canonical = validateTimeZone('Asia/Calcutta');
    expect(canonical).not.toBeNull();
    expect(validateTimeZone(canonical)).toBe(canonical);
  });

  it('trims surrounding spaces', () => {
    expect(validateTimeZone('  Europe/Paris ')).toBe('Europe/Paris');
  });

  it.each([
    ['unknown zone', 'Mars/Olympus_Mons'],
    ['wrong shape', 'London'],
    ['offset style', '+05:30'],
    ['empty', ''],
    ['spaces only', '   '],
    ['too long', `Europe/${'A'.repeat(80)}`],
    ['injection style', "Europe/London'; DROP TABLE check_ins;--"],
    ['markup', '<script>alert(1)</script>'],
    ['newline', 'Europe/London\nUTC'],
    ['path traversal', '../../etc/passwd'],
  ])('rejects %s', (_label, value) => {
    expect(validateTimeZone(value)).toBeNull();
  });

  it.each([[undefined], [null], [42], [true], [{}], [['Europe/London']]])(
    'rejects the non-string %j',
    (value) => {
      expect(validateTimeZone(value)).toBeNull();
    },
  );
});

describe('localDateIn and utcOffsetMinutesAt', () => {
  it('differs from the UTC date across the date line', () => {
    const instant = new Date('2026-11-09T23:30:00Z');
    expect(localDateIn(instant, 'UTC')).toBe('2026-11-09');
    expect(localDateIn(instant, 'Pacific/Kiritimati')).toBe('2026-11-10'); // UTC+14
    expect(localDateIn(instant, 'Pacific/Pago_Pago')).toBe('2026-11-09'); // UTC-11
    expect(localDateIn(new Date('2026-11-09T05:00:00Z'), 'Pacific/Pago_Pago')).toBe('2026-11-08');
    expect(utcOffsetMinutesAt(instant, 'Pacific/Kiritimati')).toBe(14 * 60);
    expect(utcOffsetMinutesAt(instant, 'Pacific/Pago_Pago')).toBe(-11 * 60);
  });

  it('handles half-hour offsets', () => {
    const instant = new Date('2026-11-09T19:00:00Z');
    expect(utcOffsetMinutesAt(instant, 'Asia/Kolkata')).toBe(330);
    expect(localDateIn(instant, 'Asia/Kolkata')).toBe('2026-11-10'); // 00:30 next day
  });

  it('follows the Europe/London clock changes at the exact instants', () => {
    // 2026: BST starts Sun 29 Mar 01:00 UTC, ends Sun 25 Oct 01:00 UTC.
    expect(utcOffsetMinutesAt(new Date('2026-03-29T00:59:59Z'), 'Europe/London')).toBe(0);
    expect(utcOffsetMinutesAt(new Date('2026-03-29T01:00:00Z'), 'Europe/London')).toBe(60);
    expect(utcOffsetMinutesAt(new Date('2026-10-25T00:59:59Z'), 'Europe/London')).toBe(60);
    expect(utcOffsetMinutesAt(new Date('2026-10-25T01:00:00Z'), 'Europe/London')).toBe(0);
    // 23:30 UTC in British Summer Time is already tomorrow.
    expect(localDateIn(new Date('2026-07-01T23:30:00Z'), 'Europe/London')).toBe('2026-07-02');
    expect(localDateIn(new Date('2026-12-01T23:30:00Z'), 'Europe/London')).toBe('2026-12-01');
  });

  it('follows the America/New_York clock changes at the exact instants', () => {
    // 2026: DST starts Sun 8 Mar 07:00 UTC, ends Sun 1 Nov 06:00 UTC.
    expect(utcOffsetMinutesAt(new Date('2026-03-08T06:59:59Z'), 'America/New_York')).toBe(-300);
    expect(utcOffsetMinutesAt(new Date('2026-03-08T07:00:00Z'), 'America/New_York')).toBe(-240);
    expect(utcOffsetMinutesAt(new Date('2026-11-01T05:59:59Z'), 'America/New_York')).toBe(-240);
    expect(utcOffsetMinutesAt(new Date('2026-11-01T06:00:00Z'), 'America/New_York')).toBe(-300);
  });

  it('gets the repeated hour of a clock change right (the same local date, two offsets)', () => {
    // 1 Nov 2026 01:30 New York happens twice: 05:30 UTC (EDT) and 06:30 UTC (EST).
    expect(localDateIn(new Date('2026-11-01T05:30:00Z'), 'America/New_York')).toBe('2026-11-01');
    expect(localDateIn(new Date('2026-11-01T06:30:00Z'), 'America/New_York')).toBe('2026-11-01');
    expect(utcOffsetMinutesAt(new Date('2026-11-01T05:30:00Z'), 'America/New_York')).toBe(-240);
    expect(utcOffsetMinutesAt(new Date('2026-11-01T06:30:00Z'), 'America/New_York')).toBe(-300);
  });

  it('handles a leap day, including its UTC boundary', () => {
    expect(localDateIn(new Date('2028-02-29T12:00:00Z'), 'Europe/London')).toBe('2028-02-29');
    expect(localDateIn(new Date('2028-02-29T23:30:00Z'), 'Pacific/Kiritimati')).toBe('2028-03-01');
    expect(localDateIn(new Date('2028-03-01T03:00:00Z'), 'America/Los_Angeles')).toBe('2028-02-29');
    // 2026 is not a leap year: 28 Feb rolls straight to 1 Mar.
    expect(localDateIn(new Date('2026-02-28T23:30:00Z'), 'Pacific/Kiritimati')).toBe('2026-03-01');
  });

  it('ignores milliseconds when working out the offset', () => {
    expect(utcOffsetMinutesAt(new Date('2026-07-01T12:00:00.999Z'), 'Europe/London')).toBe(60);
  });
});

describe('buildTimeZoneMetadata', () => {
  const instant = new Date('2026-07-01T23:30:00Z');

  it('records the zone with the server-computed local date and offset', () => {
    expect(buildTimeZoneMetadata('Europe/London', instant)).toEqual({
      metadata: { timeZone: 'Europe/London', localDate: '2026-07-02', utcOffsetMinutes: 60 },
      rejected: false,
    });
  });

  it('records nothing, without complaint, when no zone was sent', () => {
    for (const none of [undefined, null, '']) {
      expect(buildTimeZoneMetadata(none, instant)).toEqual({ metadata: {}, rejected: false });
    }
  });

  it('records nothing, and reports the rejection, for an unusable zone', () => {
    for (const bad of ['Nowhere/Land', 12, {}, "x'; --"]) {
      expect(buildTimeZoneMetadata(bad, instant)).toEqual({ metadata: {}, rejected: true });
    }
  });

  it('records nothing for an invalid instant instead of throwing', () => {
    expect(buildTimeZoneMetadata('Europe/London', new Date('nope'))).toEqual({
      metadata: {},
      rejected: true,
    });
  });
});

describe('describeRejectedTimeZone', () => {
  it('caps length and strips control characters for the log line', () => {
    expect(describeRejectedTimeZone(`a\nb${'x'.repeat(100)}`)).toHaveLength(64);
    expect(describeRejectedTimeZone('a\nb')).toBe('a?b');
    expect(describeRejectedTimeZone(5)).toBe('non-string (number)');
  });
});
