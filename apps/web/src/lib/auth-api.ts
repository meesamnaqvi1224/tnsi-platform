import { auth } from '@clerk/nextjs/server';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { db, users, entitlements } from '@tnsi/db';
import { eq } from 'drizzle-orm';
import type { User, Entitlement } from '@tnsi/db/schema';
import { getOrCreateUser } from '@tnsi/auth/sync/user';
import {
  assertEntitlement,
  assertMemberAccess,
  type EntitlementRequirement,
} from '@tnsi/auth/authorize/entitlements';
import { EntitlementRequiredError } from '@tnsi/auth/errors/auth';
import { extractBearerToken, verifyToken } from '@tnsi/auth/verify/jwt';
import { userSyncOps } from './user-sync-ops';
import { reconcileMembership } from './reconcile-subscription';
import { unauthorized, forbidden } from './api-response';

export interface AuthUser extends User {
  /**
   * The member's entitlement row. `stripeUnreachable` is never stored: it is set
   * on this copy only when a read-time refresh from Stripe was attempted and
   * Stripe was genuinely unavailable (see `reconcileMembership`).
   */
  entitlements: (Entitlement & { stripeUnreachable?: boolean }) | null;
}

/**
 * Resolve the Clerk user id for the current request.
 *
 * The web dashboard authenticates via Clerk's cookie session (`auth()`).
 * The native mobile app has no cookie jar, so it sends
 * `Authorization: Bearer <clerk-session-jwt>` instead (obtained from Clerk
 * Expo's `getToken()`). A bearer token is only ever present on an explicit
 * API call from a non-browser client, never on a normal web
 * page/asset request, so checking it first and falling back to the cookie
 * session is purely additive: existing web requests never carry an
 * `Authorization` header and are unaffected.
 *
 * A *present but invalid/expired* bearer token is treated as unauthenticated
 * outright rather than falling back to the cookie session - a bad mobile
 * token must never silently succeed by riding along on an unrelated cookie.
 */
async function resolveClerkUserId(): Promise<string | null> {
  const headerList = await headers();
  const bearerToken = extractBearerToken(headerList.get('authorization'));

  if (bearerToken) {
    try {
      const payload = await verifyToken(bearerToken);
      return payload.sub;
    } catch {
      return null;
    }
  }

  const { userId } = await auth();
  return userId ?? null;
}

export async function getAuthUser(): Promise<AuthUser | null> {
  const userId = await resolveClerkUserId();
  if (!userId) return null;

  let dbUser = await db.select().from(users).where(eq(users.clerkUserId, userId)).limit(1);

  if (!dbUser[0]) {
    // A valid Clerk session can arrive before the async user.created webhook
    // has synced this user into Postgres (e.g. right after sign-up, before
    // Clerk's callback has landed). Rather than surfacing a false
    // "not authenticated" for a real, authenticated user, provision the row
    // inline using the same sync path the webhook uses.
    try {
      await getOrCreateUser(userId, userSyncOps);
    } catch {
      // Lost a race with the webhook provisioning the same user
      // concurrently (unique constraint on clerkUserId). Re-query below -
      // the other side's write should have landed.
    }
    dbUser = await db.select().from(users).where(eq(users.clerkUserId, userId)).limit(1);
  }

  if (!dbUser[0] || dbUser[0].deletedAt) return null;

  const userEntitlements = await db
    .select()
    .from(entitlements)
    .where(eq(entitlements.userId, dbUser[0].id))
    .limit(1);

  let entitlement: (Entitlement & { stripeUnreachable?: boolean }) | null =
    userEntitlements[0] ?? null;

  // A Stripe-backed membership whose paid period has ended but whose renewal is
  // unconfirmed (a delayed webhook) is refreshed from Stripe BEFORE any access
  // decision is made from it. Stripe's answer decides; only a genuine outage
  // lets access be held, and only within the bounds in `resolveMembership`.
  if (entitlement) {
    const outcome = await reconcileMembership({ userId: dbUser[0].id, record: entitlement });
    if (outcome.status === 'refreshed') {
      const [fresh] = await db
        .select()
        .from(entitlements)
        .where(eq(entitlements.userId, dbUser[0].id))
        .limit(1);
      entitlement = fresh ?? entitlement;
    } else if (outcome.status === 'unreachable') {
      entitlement = { ...entitlement, stripeUnreachable: true };
    }
  }

  return {
    ...dbUser[0],
    entitlements: entitlement,
  };
}

export async function requireAuth(): Promise<AuthUser> {
  const user = await getAuthUser();
  if (!user) {
    throw new Error('UNAUTHENTICATED');
  }
  return user;
}

/**
 * Page-only variant of `requireAuth()`: redirects to `/sign-in` instead of
 * throwing when unauthenticated.
 *
 * Middleware (`clerkMiddleware`/`auth.protect()`) already blocks
 * unauthenticated requests to every `/dashboard*` route before the page
 * ever renders — under normal conditions `requireAuth()` inside a
 * dashboard page should never actually throw. But if it does (e.g. a
 * session middleware accepted that this DB-backed check can't validate —
 * seen in production as `/dashboard` rendering blank instead of
 * redirecting), `requireAuth()`'s plain `throw new Error('UNAUTHENTICATED')`
 * had no error boundary to catch it anywhere in the app (no
 * `error.tsx`/`global-error.tsx` exists), so Next.js fell back to its
 * generic, unstyled error handling instead of a clean redirect.
 *
 * Only the specific `UNAUTHENTICATED` case is converted to a redirect;
 * any other error (e.g. a real database failure) is rethrown as-is rather
 * than being misrepresented as an auth problem.
 *
 * Not used by `/api/v1/*` routes — those correctly catch `requireAuth()`'s
 * throw themselves and return a 401 JSON response; redirecting from a
 * Route Handler would be the wrong pattern there.
 */
export async function requireAuthOrRedirect(): Promise<AuthUser> {
  try {
    return await requireAuth();
  } catch (error) {
    if (error instanceof Error && error.message === 'UNAUTHENTICATED') {
      redirect('/sign-in');
    }
    throw error;
  }
}

/**
 * Require authentication AND a specific entitlement requirement.
 * Authentication and authorization stay two separate steps: this throws
 * plain `Error('UNAUTHENTICATED')` (same as `requireAuth`, for existing
 * 401 handling) when there's no session, and `EntitlementRequiredError`
 * (403, from `@tnsi/auth`) when the session is valid but the user's
 * entitlement doesn't satisfy `requirement`. The entitlement decision
 * itself is delegated to `assertEntitlement` (`@tnsi/auth`), which is pure
 * and has no database dependency — only the entitlement fetch happens
 * here.
 *
 * Not called by any route yet — this establishes the boundary for C7 to
 * consume when protected dashboard content is built.
 */
export async function requireEntitlement(requirement: EntitlementRequirement): Promise<AuthUser> {
  const user = await requireAuth();
  assertEntitlement(user.entitlements, requirement);
  return user;
}

/**
 * The single authoritative "does this authenticated user have a member
 * account?" check (Today, Practices, Practice Detail, Saved Practices,
 * Practice History, My Journey, Daily Check-In) — Membership &
 * Entitlements v1. Every member-facing API route and dashboard page
 * should call this (or `requireMemberAccessOrRedirect` below for pages)
 * instead of independently re-implementing a membership check; that's
 * what keeps this a single decision point rather than scattered
 * `if (user.entitlements.status === ...)` checks throughout the app.
 *
 * Same throw contract as `requireAuth()`: plain `Error('UNAUTHENTICATED')`
 * when there's no session (→ 401 via `memberAccessErrorResponse` below),
 * `EntitlementRequiredError` when the session is valid but the user has no
 * entitlement row at all (→ 403).
 *
 * Approved model: Free account → Paid membership → Membership ends → Free
 * account. A user whose paid membership has ended (cancelled and the period
 * over, expired, unpaid past the 7-day grace period) still has their free
 * account, so they pass this check; what they lose is PAID access, which
 * `contentAccessFor` / `resolveMembership` decide per piece of content.
 * The actual decision is `assertMemberAccess` (`@tnsi/auth`), pure and
 * unit-tested independently of any database or Clerk call.
 */
export async function requireMemberAccess(): Promise<AuthUser> {
  const user = await requireAuth();
  assertMemberAccess(user.entitlements);
  return user;
}

/**
 * Page-only variant of `requireMemberAccess()`, mirroring
 * `requireAuthOrRedirect`'s redirect-instead-of-throw shape. The only
 * denial is a signed-in user with no entitlement row at all, which is sent
 * to `/dashboard/billing` — a page that needs authentication only, so this
 * can never redirect back on itself. An ended paid membership is NOT a
 * denial: that user keeps the free account and stays where they are.
 */
export async function requireMemberAccessOrRedirect(): Promise<AuthUser> {
  try {
    return await requireMemberAccess();
  } catch (error) {
    if (error instanceof Error && error.message === 'UNAUTHENTICATED') {
      redirect('/sign-in');
    }
    if (error instanceof EntitlementRequiredError) {
      redirect('/dashboard/billing');
    }
    throw error;
  }
}

/**
 * Maps a `requireMemberAccess()`/`requireEntitlement()` rejection to the
 * correct API response — 401 for "not authenticated at all", 403 for
 * "authenticated but not entitled" — so every member-only route handles
 * this identically instead of each writing its own `catch { ... }`
 * translation (and risking collapsing both cases into a blanket 401, the
 * bug this exists to prevent). Never includes entitlement/billing details
 * in the response body — `forbidden()`'s default message only.
 */
export function memberAccessErrorResponse(error: unknown) {
  if (error instanceof EntitlementRequiredError) {
    return forbidden();
  }
  return unauthorized();
}
