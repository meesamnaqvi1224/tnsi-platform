import { ApiRequestError } from '@/api/types';
import { humanizeApiError, isMembershipRequiredError } from '@/lib/api-errors';

/** What the PowerDrop™ detail screen shows when GET /api/v1/powerdrops/[slug] fails. */
export type PowerDropDetailFailure =
  { status: 'not-found' } | { status: 'locked' } | { status: 'error'; message: string };

/**
 * Pure (no React Native), so it can be unit-tested with the rest of the
 * mobile logic. A PowerDrop the member can't open is refused by the server
 * with 403 `MEMBERSHIP_REQUIRED` and none of its content; that reads as a
 * membership prompt - the same destination a locked library card leads to -
 * rather than a generic error with a retry that can never succeed. Every
 * other failure keeps its existing handling.
 */
export function classifyPowerDropDetailError(err: unknown): PowerDropDetailFailure {
  if (err instanceof ApiRequestError && err.status === 404) return { status: 'not-found' };
  if (isMembershipRequiredError(err)) return { status: 'locked' };
  return { status: 'error', message: humanizeApiError(err) };
}
