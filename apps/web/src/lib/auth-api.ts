import { auth } from '@clerk/nextjs/server';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { db, users, entitlements } from '@tnsi/db';
import { eq } from 'drizzle-orm';
import type { User, Entitlement } from '@tnsi/db/schema';
import { getOrCreateUser } from '@tnsi/auth/sync/user';
import { assertEntitlement, type EntitlementRequirement } from '@tnsi/auth/authorize/entitlements';
import { extractBearerToken, verifyToken } from '@tnsi/auth/verify/jwt';
import { userSyncOps } from './user-sync-ops';

export interface AuthUser extends User {
  entitlements: Entitlement | null;
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

  return {
    ...dbUser[0],
    entitlements: userEntitlements[0] ?? null,
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
