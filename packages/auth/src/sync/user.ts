/**
 * Clerk user synchronization to PostgreSQL.
 * Handles user.created, user.updated, user.deleted webhook events.
 * Idempotent and safe for duplicate delivery.
 *
 * This module provides pure functions for user sync logic.
 * The actual database operations are performed by the consumer (web app).
 */

import type { ClerkWebhookEventType } from '../types';
import {
  verifyWebhook,
  isUserEvent,
  getUserIdFromEvent,
  getEmailFromEvent,
  getFullNameFromEvent,
  getAvatarUrlFromEvent,
  getMetadataFromEvent,
} from '../verify/webhook';

/**
 * User data for upsert operations.
 */
export interface SyncUserData {
  clerkUserId: string;
  email: string;
  fullName: string | null;
  avatarUrl: string;
  metadata: Record<string, unknown>;
}

/**
 * Database user record shape (matches @tnsi/db schema).
 */
export interface DbUser {
  id: string;
  clerkUserId: string;
  email: string;
  fullName: string | null;
  avatarUrl: string | null;
  metadata: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

/**
 * Database entitlement record shape (matches @tnsi/db schema).
 */
export interface DbEntitlement {
  userId: string;
  tier: 'free' | 'monthly' | 'annual' | 'lifetime';
  status: 'active' | 'past_due' | 'canceled' | 'trialing' | 'expired';
  programs: string[];
  certifications: string[];
  features: string[];
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
  currentPeriodStart: Date | null;
  currentPeriodEnd: Date | null;
  cancelAtPeriodEnd: boolean;
  canceledAt: Date | null;
  metadata: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Extract user data from a verified Clerk webhook event.
 */
export function extractUserData(event: ReturnType<typeof verifyWebhook>): SyncUserData {
  if (!isUserEvent(event)) {
    throw new Error('Event is not a user event');
  }
  return {
    clerkUserId: getUserIdFromEvent(event),
    email: getEmailFromEvent(event),
    fullName: getFullNameFromEvent(event),
    avatarUrl: getAvatarUrlFromEvent(event),
    metadata: getMetadataFromEvent(event),
  };
}

/**
 * User sync operations interface.
 * Implement this in the consumer (web app) with actual database operations.
 */
export interface UserSyncOperations {
  /**
   * Find user by Clerk user ID.
   */
  findUserByClerkId(clerkUserId: string): Promise<DbUser | null>;

  /**
   * Upsert user (create or update).
   */
  upsertUser(userData: SyncUserData): Promise<DbUser>;

  /**
   * Soft delete user by Clerk user ID.
   */
  softDeleteUser(clerkUserId: string): Promise<DbUser | null>;

  /**
   * Create default entitlements for a new user.
   */
  createDefaultEntitlements(userId: string): Promise<void>;

  /**
   * Get user by Clerk user ID for reconciliation.
   */
  getOrCreateUser(clerkUserId: string): Promise<DbUser>;
}

/**
 * Process a Clerk webhook event and sync using provided operations.
 * Handles user.created, user.updated, user.deleted.
 *
 * @param payload - Raw request body as string
 * @param headers - Request headers (must contain svix headers)
 * @param ops - Database operations implementation
 * @returns Object describing the sync result
 */
export async function syncClerkUser(
  payload: string,
  headers: Record<string, string | undefined>,
  ops: UserSyncOperations,
): Promise<{ action: ClerkWebhookEventType; userId: string | null }> {
  const event = verifyWebhook(payload, headers);

  if (!isUserEvent(event)) {
    // Not a user event we handle - acknowledge but don't process
    return { action: event.type, userId: null };
  }

  const clerkUserId = getUserIdFromEvent(event);

  switch (event.type) {
    case 'user.created': {
      const userData = extractUserData(event);
      await ops.upsertUser(userData);
      await ops.createDefaultEntitlements((await ops.findUserByClerkId(clerkUserId))!.id);
      return { action: 'user.created', userId: clerkUserId };
    }
    case 'user.updated': {
      const userData = extractUserData(event);
      await ops.upsertUser(userData);
      return { action: 'user.updated', userId: clerkUserId };
    }
    case 'user.deleted': {
      await ops.softDeleteUser(clerkUserId);
      return { action: 'user.deleted', userId: clerkUserId };
    }
    default:
      return { action: event.type, userId: clerkUserId };
  }
}

/**
 * Get or create a user for an authenticated request.
 * Used as a fallback when a user authenticates but doesn't exist in DB yet.
 * Creates user and default entitlements if missing.
 *
 * @param clerkUserId - Clerk user ID from verified token
 * @param ops - Database operations implementation
 * @returns The user record
 */
export async function getOrCreateUser(
  clerkUserId: string,
  ops: UserSyncOperations,
): Promise<DbUser> {
  return ops.getOrCreateUser(clerkUserId);
}

/**
 * Default entitlement values for new users.
 */
export const DEFAULT_ENTITLEMENTS: Omit<DbEntitlement, 'userId'> = {
  tier: 'free',
  status: 'active',
  programs: [],
  certifications: [],
  features: [],
  stripeCustomerId: null,
  stripeSubscriptionId: null,
  currentPeriodStart: null,
  currentPeriodEnd: null,
  cancelAtPeriodEnd: false,
  canceledAt: null,
  metadata: {},
  createdAt: new Date(),
  updatedAt: new Date(),
};
