import { ApiRequestError } from '@/api/types';
import { humanizeApiError } from '@/lib/api-errors';

/** What the PowerDrop™ detail screen shows when GET /api/v1/powerdrops/[slug] fails. */
export type PowerDropDetailFailure =
  | { status: 'not-found' }
  | { status: 'membership-required' }
  | { status: 'error'; message: string };

/**
 * Pure (no React Native), so it can be unit-tested with the rest of the
 * mobile logic. A PowerDrop the member can't open is refused by the server
 * with 403 `MEMBERSHIP_REQUIRED` and none of its content; that reads as a
 * membership prompt - the same destination a locked library card leads to -
 * rather than a generic error with a retry that can never succeed. Every
 * other failure keeps its existing handling.
 */
export function classifyPowerDropDetailError(err: unknown): PowerDropDetailFailure {
  if (err instanceof ApiRequestError) {
    if (err.status === 404) return { status: 'not-found' };
    if (err.status === 403 && err.code === 'MEMBERSHIP_REQUIRED') {
      return { status: 'membership-required' };
    }
  }
  return { status: 'error', message: humanizeApiError(err) };
}
