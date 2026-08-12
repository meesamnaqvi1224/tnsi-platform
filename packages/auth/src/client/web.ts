/**
 * Clerk web client helpers for Next.js App Router.
 * Server-side helpers for Server Components and Server Actions.
 */

import { auth, currentUser, clerkClient } from '@clerk/nextjs/server';
import type { CurrentUser } from '../types';

/**
 * Get the current authenticated user's Clerk ID.
 * Returns null if not authenticated.
 * Must be called in a Server Component or Server Action.
 */
export async function getClerkUserId(): Promise<string | null> {
  const { userId } = await auth();
  return userId;
}

/**
 * Get the current authenticated user's full Clerk user object.
 * Returns null if not authenticated.
 * Must be called in a Server Component or Server Action.
 */
export async function getCurrentClerkUser() {
  return currentUser();
}

/**
 * Get the current user with basic profile info.
 * Returns null if not authenticated.
 */
export async function getCurrentUser(): Promise<CurrentUser | null> {
  const clerkUser = await currentUser();
  if (!clerkUser) return null;

  return {
    id: '', // Will be populated by caller after DB lookup
    clerkUserId: clerkUser.id,
    email: clerkUser.emailAddresses[0]?.emailAddress ?? '',
    fullName: [clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(' ') || null,
    avatarUrl: clerkUser.imageUrl ?? null,
  };
}

/**
 * Get the Clerk server client for administrative operations.
 * Use for user management, session revocation, etc.
 */
export function getClerkServerClient() {
  return clerkClient();
}

/**
 * Require authentication - throws if not authenticated.
 * Use in Server Actions that require authentication.
 */
export async function requireAuth(): Promise<{ userId: string }> {
  const { userId } = await auth();
  if (!userId) {
    throw new Error('Authentication required');
  }
  return { userId };
}

/**
 * Get the current session ID.
 * Returns null if not authenticated.
 */
export async function getSessionId(): Promise<string | null> {
  const { sessionId } = await auth();
  return sessionId;
}

/**
 * Get the organization ID if user is in an organization.
 * Returns null if not in an organization.
 */
export async function getOrgId(): Promise<string | null> {
  const { orgId } = await auth();
  return orgId ?? null;
}
