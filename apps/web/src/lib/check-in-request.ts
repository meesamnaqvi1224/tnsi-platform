/**
 * The browser's IANA time zone (for example "Europe/London"), or `undefined` when it cannot say.
 * Only the identifier is sent; the server validates it and derives the rest (see lib/time-zone.ts).
 * Never throws: a check-in must go through without it.
 */
export function browserTimeZone(): string | undefined {
  try {
    const zone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    return typeof zone === 'string' && zone.length > 0 ? zone : undefined;
  } catch {
    return undefined;
  }
}

/**
 * The body of POST /api/v1/check-ins from the dashboard form; `timeZone` only when known. The zone is a
 * required argument (not a default) so the caller always states it, `undefined` included.
 */
export function buildCheckInBody(
  input: { moodScore: number; capacityScore: number; notes?: string | undefined },
  timeZone: string | undefined,
) {
  return {
    moodScore: input.moodScore,
    capacityScore: input.capacityScore,
    notes: input.notes,
    ...(timeZone ? { timeZone } : {}),
  };
}
