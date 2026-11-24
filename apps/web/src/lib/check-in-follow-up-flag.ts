/**
 * The check-in follow-up switch.
 *
 * The follow-up question (and everything that reads its answer) is active only when the server
 * environment variable CHECKIN_FOLLOW_UP_ENABLED is exactly `true`. Anything else - unset, empty,
 * `false`, `1` - means OFF. Merging the code deploys it dark: while off, POST /api/v1/check-ins ignores
 * and does not store a follow-up, the daily recommendation and suggestions behave exactly as before, and
 * GET /api/v1/features reports `checkInFollowUp: false` so the apps do not show the question.
 *
 * Read at call time (not at import) so a changed value takes effect on the next request/deploy and
 * tests can set it. Server-only: never exposed through NEXT_PUBLIC_*.
 */
export function isCheckInFollowUpEnabled(): boolean {
  return process.env.CHECKIN_FOLLOW_UP_ENABLED === 'true';
}
