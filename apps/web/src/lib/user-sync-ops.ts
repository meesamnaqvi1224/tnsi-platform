import { db } from '@tnsi/db';
import { users, entitlements } from '@tnsi/db/schema';
import { eq } from 'drizzle-orm';
import {
  type SyncUserData,
  type DbUser,
  type UserSyncOperations,
  DEFAULT_ENTITLEMENTS,
} from '@tnsi/auth/sync/user';
import { getClerkUser } from '@tnsi/auth/client/server';

/**
 * Database operations backing Clerk user sync. Shared by the webhook route
 * (async, event-driven sync) and getAuthUser (synchronous fallback for a
 * session that arrives before the webhook has landed) — see
 * apps/web/src/lib/auth-api.ts.
 */
export const userSyncOps: UserSyncOperations = {
  async findUserByClerkId(clerkUserId: string): Promise<DbUser | null> {
    const result = await db.select().from(users).where(eq(users.clerkUserId, clerkUserId)).limit(1);
    return result[0] || null;
  },

  async upsertUser(userData: SyncUserData): Promise<DbUser> {
    const existing = await this.findUserByClerkId(userData.clerkUserId);

    if (existing) {
      // deletedAt is intentionally left untouched here. Clerk never sends an
      // "undelete" event, so once user.deleted has set it, any user.updated
      // for this clerkUserId is by definition stale/out-of-order and must not
      // clear it. Restoring a soft-deleted user is a separate, explicit path
      // (see getOrCreateUser below).
      const [updated] = await db
        .update(users)
        .set({
          email: userData.email,
          fullName: userData.fullName,
          avatarUrl: userData.avatarUrl,
          metadata: userData.metadata,
          updatedAt: new Date(),
        })
        .where(eq(users.clerkUserId, userData.clerkUserId))
        .returning();
      if (!updated) {
        throw new Error(`User ${userData.clerkUserId} was deleted concurrently during update`);
      }
      return updated;
    }

    const [created] = await db
      .insert(users)
      .values({
        clerkUserId: userData.clerkUserId,
        email: userData.email,
        fullName: userData.fullName,
        avatarUrl: userData.avatarUrl,
        metadata: userData.metadata,
      })
      .returning();
    if (!created) {
      throw new Error(`Failed to create user ${userData.clerkUserId}`);
    }
    return created;
  },

  async softDeleteUser(clerkUserId: string): Promise<DbUser | null> {
    const existing = await this.findUserByClerkId(clerkUserId);
    if (!existing) return null;

    const [deleted] = await db
      .update(users)
      .set({
        deletedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(users.clerkUserId, clerkUserId))
      .returning();
    return deleted ?? null;
  },

  async createDefaultEntitlements(userId: string): Promise<void> {
    const existing = await db
      .select()
      .from(entitlements)
      .where(eq(entitlements.userId, userId))
      .limit(1);

    if (existing.length > 0) return;

    await db.insert(entitlements).values({
      userId,
      ...DEFAULT_ENTITLEMENTS,
    });
  },

  async getOrCreateUser(clerkUserId: string): Promise<DbUser> {
    const existing = await this.findUserByClerkId(clerkUserId);
    if (existing) {
      if (existing.deletedAt) {
        const [restored] = await db
          .update(users)
          .set({ deletedAt: null, updatedAt: new Date() })
          .where(eq(users.clerkUserId, clerkUserId))
          .returning();
        if (!restored) {
          throw new Error(`User ${clerkUserId} was deleted concurrently during restore`);
        }
        return restored;
      }
      return existing;
    }

    // Fetch from Clerk API
    const clerkUser = await getClerkUser(clerkUserId);

    const userData: SyncUserData = {
      clerkUserId: clerkUser.id,
      email: clerkUser.emailAddresses[0]?.emailAddress || '',
      fullName: [clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(' ') || null,
      avatarUrl: clerkUser.imageUrl,
      metadata: clerkUser.publicMetadata as Record<string, unknown>,
    };

    const user = await this.upsertUser(userData);
    await this.createDefaultEntitlements(user.id);
    return user;
  },
};
