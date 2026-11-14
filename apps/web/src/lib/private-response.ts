import type { NextResponse } from 'next/server';
import { internalError } from './api-response';

/**
 * Responses that carry (or could carry) a member's private writing must never be stored by a browser,
 * a CDN or any intermediary: `private` forbids shared caches, `no-store` forbids any cache at all.
 */
export const PRIVATE_NO_STORE = 'private, no-store, max-age=0';

/** Marks a response as private and uncacheable. Applied to every response from a journal route, errors included. */
export function asPrivate<T extends NextResponse>(response: T): T {
  response.headers.set('Cache-Control', PRIVATE_NO_STORE);
  response.headers.set('Pragma', 'no-cache');
  return response;
}

/**
 * Wraps a route handler so that EVERY outcome - success, validation error, 401/403/404 and an
 * unexpected failure - is private/no-store, and so that nothing thrown inside can reach the client or
 * a log with its detail. The catch deliberately logs a fixed label and, at most, a short database error
 * code: a driver error object can carry the SQL text and its bound parameters (which would be the
 * member's writing), so the error itself is never logged.
 */
export function privateRoute<Args extends unknown[]>(
  label: string,
  handler: (...args: Args) => Promise<NextResponse>,
): (...args: Args) => Promise<NextResponse> {
  return async (...args: Args) => {
    try {
      return asPrivate(await handler(...args));
    } catch (error) {
      console.error(`[${label}] request failed`, { code: safeErrorCode(error) });
      return asPrivate(internalError());
    }
  };
}

/** A short, content-free identifier for a failure: the Postgres error code when there is one. */
export function safeErrorCode(error: unknown): string {
  const code = (error as { code?: unknown } | null)?.code;
  return typeof code === 'string' && /^[0-9A-Za-z_]{1,16}$/.test(code) ? code : 'unknown';
}
