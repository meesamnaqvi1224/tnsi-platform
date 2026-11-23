import type { CheckIn, TodayResponse } from '@/api/types';

/**
 * Home's data right after a check-in is saved, before the server's fresh answer has arrived.
 *
 * Today's check-in is applied at once, but everything the server recommended was worked out from the
 * PREVIOUS check-in (an earlier day's answer). Keeping it would show that old recommendation as if it
 * were for this check-in until the refetch lands, and for good if the refetch fails. So it is cleared:
 * Home shows its quiet loading state, then the real recommendation, and never a stale one.
 */
export function withCheckInApplied(data: TodayResponse, checkIn: CheckIn): TodayResponse {
  return {
    ...data,
    checkIn,
    todayPractice: null,
    alternativePractice: null,
    suggestions: { items: [], condition: null },
  };
}
