/**
 * Time zones for check-ins (phase 1: record only; see docs/check-in-timezone-plan.md).
 *
 * The client sends only an IANA zone name. Everything derived from it is computed here, never taken
 * from the client. None of this is used to decide what "today" is: `completed_date` and every
 * daily-logic rule stay on the server's day in this phase.
 */

/** `UTC`/`GMT`, or an IANA `Area/Location` (optionally `Area/Region/Location`). */
const IANA_SHAPE = /^(?:UTC|GMT|[A-Za-z][A-Za-z0-9_+-]*(?:\/[A-Za-z0-9_+-]+){1,2})$/;

/**
 * The canonical zone name when `value` is a valid IANA time zone the runtime knows, else `null`.
 * Never throws: an invalid or missing zone is simply not recorded.
 */
export function validateTimeZone(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const candidate = value.trim();
  if (candidate.length === 0 || candidate.length > 64 || !IANA_SHAPE.test(candidate)) return null;
  try {
    return new Intl.DateTimeFormat('en-US', { timeZone: candidate }).resolvedOptions().timeZone;
  } catch {
    return null;
  }
}

interface LocalParts {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
}

function localPartsIn(instant: Date, timeZone: string): LocalParts {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).formatToParts(instant);
  const get = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((part) => part.type === type)?.value);
  return {
    year: get('year'),
    month: get('month'),
    day: get('day'),
    hour: get('hour'),
    minute: get('minute'),
    second: get('second'),
  };
}

const pad = (n: number, width = 2) => String(n).padStart(width, '0');

/** The calendar date ("YYYY-MM-DD") it is in `timeZone` at `instant`. */
export function localDateIn(instant: Date, timeZone: string): string {
  const { year, month, day } = localPartsIn(instant, timeZone);
  return `${pad(year, 4)}-${pad(month)}-${pad(day)}`;
}

/** Minutes `timeZone` is ahead of UTC at `instant` (negative when behind), for that exact instant, daylight saving included. */
export function utcOffsetMinutesAt(instant: Date, timeZone: string): number {
  const { year, month, day, hour, minute, second } = localPartsIn(instant, timeZone);
  const localAsUtc = Date.UTC(year, month - 1, day, hour, minute, second);
  const instantSeconds = Math.floor(instant.getTime() / 1000) * 1000;
  return Math.round((localAsUtc - instantSeconds) / 60000);
}

export type TimeZoneMetadata = {
  timeZone: string;
  localDate: string;
  utcOffsetMinutes: number;
};

/**
 * What to store in `check_ins.metadata` for a client-reported zone: the validated zone plus the
 * server-computed local date and offset at `instant`. When the zone is missing or invalid the result
 * is empty (`{}`) and the check-in is saved without it; `rejected` is true only when something WAS
 * sent but could not be used, so the caller can log it. Never throws.
 */
export function buildTimeZoneMetadata(
  reported: unknown,
  instant: Date,
): { metadata: TimeZoneMetadata | Record<string, never>; rejected: boolean } {
  if (reported === undefined || reported === null || reported === '') {
    return { metadata: {}, rejected: false };
  }
  try {
    const timeZone = validateTimeZone(reported);
    if (!timeZone || Number.isNaN(instant.getTime())) return { metadata: {}, rejected: true };
    return {
      metadata: {
        timeZone,
        localDate: localDateIn(instant, timeZone),
        utcOffsetMinutes: utcOffsetMinutesAt(instant, timeZone),
      },
      rejected: false,
    };
  } catch {
    return { metadata: {}, rejected: true };
  }
}

/** A short, log-safe rendering of a rejected value (length-capped, control characters removed). */
export function describeRejectedTimeZone(value: unknown): string {
  if (typeof value !== 'string') return `non-string (${typeof value})`;
  // eslint-disable-next-line no-control-regex -- stripping control characters is the point
  return value.replace(/[\u0000-\u001f\u007f]/g, '?').slice(0, 64);
}
