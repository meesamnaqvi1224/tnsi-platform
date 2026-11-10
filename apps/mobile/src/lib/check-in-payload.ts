import type { CheckInInput } from '@/api/types';

/**
 * The IANA time zone this device is set to (for example "Europe/London"), or `undefined` when the
 * runtime cannot say. Only the identifier is sent: the server validates it and works out everything
 * else (see apps/web/src/lib/time-zone.ts). Never throws - a check-in must go through without it.
 */
export function deviceTimeZone(): string | undefined {
  try {
    const zone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    return typeof zone === 'string' && zone.length > 0 ? zone : undefined;
  } catch {
    return undefined;
  }
}

/**
 * The body of POST /api/v1/check-ins for the home check-in, where mood and capacity are the same
 * answer. `timeZone` is included only when known, so the request is otherwise identical to what older
 * builds send.
 */
export function buildCheckInPayload(capacity: number, timeZone: string | undefined): CheckInInput {
  return {
    moodScore: capacity,
    capacityScore: capacity,
    ...(timeZone ? { timeZone } : {}),
  };
}
