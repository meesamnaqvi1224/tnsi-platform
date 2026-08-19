import { auth } from '@clerk/nextjs/server';
import { db, users, entitlements } from '@tnsi/db';
import { eq } from 'drizzle-orm';
import type { User, Entitlement } from '@tnsi/db/schema';
import { assertEntitlement, type EntitlementRequirement } from '@tnsi/auth/authorize/entitlements';

export interface AuthUser extends User {
  entitlements: Entitlement | null;
}

export async function getAuthUser(): Promise<AuthUser | null> {
  const { userId } = await auth();
  if (!userId) return null;

  const dbUser = await db.select().from(users).where(eq(users.clerkUserId, userId)).limit(1);

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
