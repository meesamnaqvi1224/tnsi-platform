import { auth } from '@clerk/nextjs/server';
import { db, users, entitlements } from '@tnsi/db';
import { eq } from 'drizzle-orm';
import type { User, Entitlement } from '@tnsi/db/schema';

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
