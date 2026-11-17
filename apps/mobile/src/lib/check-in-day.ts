import type { CheckIn, Practice } from '@/api/types';

/**
 * The practice "For this moment" may show. The server picks it from the member's latest check-in
 * ever, so on a new day it would still be yesterday's pick. A recommendation belongs to a check-in
 * made today: until the member checks in today there is none, and Home asks them to check in.
 * `checkIn` is today's check-in as GET /api/v1/today already reports it (null when there is none).
 */
export function practiceForToday(
  checkIn: CheckIn | null | undefined,
  recommended: Practice | null | undefined,
): Practice | null {
  return checkIn ? (recommended ?? null) : null;
}
