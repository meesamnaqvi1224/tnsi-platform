import type { CheckIn } from '@/api/types';

/**
 * Whether Home may offer "Check in again" for today's check-in.
 *
 * Additional check-ins exist only on a server that knows the primary/additional split, and such a
 * server marks every check-in it returns with `isPrimary`. An older server leaves the field out,
 * and its API would reject a second same-day check-in, so there the entry point is not offered at
 * all. Only today's PRIMARY check-in can be the one shown on Home, unless every check-in drives the
 * suggestions (`everyCheckInDrives`), when the latest one is shown whichever kind it is.
 */
export function canCheckInAgain(
  todaysCheckIn: Pick<CheckIn, 'isPrimary'>,
  everyCheckInDrives = false,
): boolean {
  // When every check-in drives the suggestions (the server's follow-up switch), the check-in on Home is
  // the latest one and may itself be an additional record, so any check-in from a server that reports
  // the flag can be followed by another.
  return everyCheckInDrives
    ? typeof todaysCheckIn.isPrimary === 'boolean'
    : todaysCheckIn.isPrimary === true;
}

/**
 * What a just-saved check-in turned out to be. A saved check-in is "additional" only when the server
 * says so (`isPrimary === false`); anything else is treated as the day's primary, which is exactly
 * how a check-in is handled today. This matters in one case: a member's "check in again" can land
 * as the primary if the day had no primary after all (for example the day rolled over while the
 * form was open), and Home must then treat it as today's check-in.
 */
export function savedCheckInKind(saved: Pick<CheckIn, 'isPrimary'>): 'primary' | 'additional' {
  return saved.isPrimary === false ? 'additional' : 'primary';
}
