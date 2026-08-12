/**
 * Shared authentication types for TNSI platform.
 * Used across web, mobile, and API layers.
 */

import type { User as ClerkUser } from '@clerk/backend';

/**
 * Internal user record from PostgreSQL.
 * The source of truth for authorization/entitlements.
 */
export interface User {
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
 * Entitlements computed from PostgreSQL.
 * This is the authorization layer - separate from Clerk identity.
 */
export interface Entitlements {
  tiers: string[];
  programs: string[];
  certifications: string[];
  features: string[];
  status: 'active' | 'past_due' | 'canceled' | 'trialing' | 'expired';
  currentPeriodEnd: Date | null;
}

/**
 * Complete authentication context for a request.
 * Attached to request context after authentication + authorization.
 */
export interface AuthContext {
  userId: string;
  clerkUserId: string;
  entitlements: Entitlements;
}

/**
 * Minimal user info for contexts that don't need full entitlements.
 */
export interface CurrentUser {
  id: string;
  clerkUserId: string;
  email: string;
  fullName: string | null;
  avatarUrl: string | null;
}

/**
 * Clerk webhook event types we handle.
 */
export type ClerkWebhookEventType = 'user.created' | 'user.updated' | 'user.deleted';

/**
 * Clerk webhook payload structure.
 */
export interface ClerkWebhookPayload {
  data: ClerkUser;
  object: 'event';
  type: ClerkWebhookEventType;
}

/**
 * Authentication error codes for consistent error handling.
 */
export type AuthErrorCode =
  | 'UNAUTHENTICATED'
  | 'TOKEN_INVALID'
  | 'SESSION_REVOKED'
  | 'ENTITLEMENT_REQUIRED'
  | 'RATE_LIMITED'
  | 'USER_NOT_FOUND'
  | 'WEBHOOK_VERIFICATION_FAILED';

/**
 * Standardized authentication error data (for serialization).
 */
export interface AuthErrorData {
  code: AuthErrorCode;
  message: string;
  statusCode: number;
  details?: Record<string, unknown>;
}

/**
 * Result type for authentication operations.
 */
export interface AuthResult<T> {
  data: T | null;
  error: AuthErrorData | null;
}
