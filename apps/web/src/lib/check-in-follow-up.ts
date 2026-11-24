import { parseFollowUp, followUpFitsAnswer, type FollowUp } from '@tnsi/core';
import { isCheckInFollowUpEnabled } from './check-in-follow-up-flag';

/**
 * The follow-up answer stored with a check-in, or `null`: when the feature is off, when the check-in has
 * none (an older app, or the member skipped it), or when what is stored is unusable or does not fit the
 * first answer. Null always means "behave exactly as the answer alone": it never throws.
 */
export function followUpOfCheckIn(
  checkIn: { capacityScore: number; metadata: unknown } | null | undefined,
): FollowUp | null {
  if (!checkIn || !isCheckInFollowUpEnabled()) return null;
  const metadata = checkIn.metadata;
  if (metadata === null || typeof metadata !== 'object' || Array.isArray(metadata)) return null;
  const followUp = parseFollowUp((metadata as Record<string, unknown>).followUp);
  return followUp && followUpFitsAnswer(followUp, checkIn.capacityScore) ? followUp : null;
}
