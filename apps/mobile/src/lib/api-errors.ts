import { ApiRequestError } from '@/api/types';

/**
 * Maps an API failure to a calm, human-readable message - never the raw
 * backend error text (which could leak internal detail), and never
 * blaming or alarming language.
 */
export function humanizeApiError(err: unknown): string {
  if (err instanceof ApiRequestError) {
    if (err.status === 0) {
      return 'Unable to reach TNSI. Please check your connection and try again.';
    }
    if (err.status === 401) {
      return 'Your session has ended. Please sign in again.';
    }
    if (err.status === 403) {
      return "You don't have access to this yet.";
    }
    if (err.status === 404) {
      return "That isn't available right now.";
    }
    if (err.status === 422 || err.status === 400) {
      return "Something about that submission wasn't quite right.";
    }
    if (err.status === 429) {
      return 'Please wait a moment before trying again.';
    }
    if (err.status >= 500) {
      return 'Something went wrong on our end. Please try again.';
    }
  }
  return 'Something went wrong. Please try again.';
}
