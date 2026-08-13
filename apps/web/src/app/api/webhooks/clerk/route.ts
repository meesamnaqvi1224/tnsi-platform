/**
 * Clerk webhook endpoint for user synchronization.
 * Handles user.created, user.updated, user.deleted events.
 * Verifies webhook signatures and syncs to PostgreSQL.
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@tnsi/db';
import { users, entitlements } from '@tnsi/db/schema';
import { eq } from 'drizzle-orm';
import {
  syncClerkUser,
  extractUserData,
  type SyncUserData,
  type DbUser,
  type UserSyncOperations,
  DEFAULT_ENTITLEMENTS,
} from '@tnsi/auth/sync/user';
import { getClerkUser } from '@tnsi/auth/client/server';

/**
 * Database operations implementation for webhook sync.
 */
const userSyncOps: UserSyncOperations = {
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

/**
 * POST /api/webhooks/clerk
 * Handles Clerk webhook events for user lifecycle.
 *
 * Expected events:
 * - user.created: Create user in PostgreSQL + default entitlements
 * - user.updated: Update user in PostgreSQL
 * - user.deleted: Soft delete user in PostgreSQL
 */
export async function POST(request: NextRequest) {
  try {
    // Get raw body as text for signature verification
    const payload = await request.text();

    // Extract svix headers
    const headers: Record<string, string | undefined> = {};
    request.headers.forEach((value, key) => {
      headers[key] = value;
    });

    // Sync user to PostgreSQL (verifies signature internally)
    const result = await syncClerkUser(payload, headers, userSyncOps);

    console.info('[Clerk Webhook]', {
      action: result.action,
      userId: result.userId,
    });

    return NextResponse.json({ success: true, action: result.action });
  } catch (error) {
    console.error('[Clerk Webhook] Error:', error);

    // Return 400 for verification failures, 500 for other errors
    const status =
      error instanceof Error && error.name === 'WebhookVerificationFailedError' ? 400 : 500;
    const message = error instanceof Error ? error.message : 'Webhook processing failed';

    return NextResponse.json({ error: message }, { status });
  }
}
