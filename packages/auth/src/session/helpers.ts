/**
 * Session helpers for authentication state management.
 * Utilities for working with sessions across web and API.
 */

import { auth } from '@clerk/nextjs/server';

/**
 * Check if the current request is authenticated.
 * Returns boolean - safe for use in conditional rendering.
 */
export async function isAuthenticated(): Promise<boolean> {
  const { userId } = await auth();
  return !!userId;
}

/**
 * Get the current user's Clerk ID if authenticated.
 * Returns null if not authenticated.
 */
export async function getAuthUserId(): Promise<string | null> {
  const { userId } = await auth();
  return userId ?? null;
}

/**
 * Get the current session ID if authenticated.
 */
export async function getAuthSessionId(): Promise<string | null> {
  const { sessionId } = await auth();
  return sessionId ?? null;
}

/**
 * Get the current organization ID if in an organization.
 */
export async function getAuthOrgId(): Promise<string | null> {
  const { orgId } = await auth();
  return orgId ?? null;
}

/**
 * Require authentication - returns userId or throws.
 * Use in Server Actions that require authentication.
 */
export async function requireUserId(): Promise<string> {
  const { userId } = await auth();
  if (!userId) {
    throw new Error('Authentication required');
  }
  return userId;
}

/**
 * Require organization membership - returns orgId or throws.
 */
export async function requireOrgId(): Promise<string> {
  const { orgId } = await auth();
  if (!orgId) {
    throw new Error('Organization membership required');
  }
  return orgId;
}

/**
 * Get all organization memberships for the current user.
 * Returns empty array if not authenticated.
 */
export async function getOrgMemberships(): Promise<Array<{ id: string; role: string }>> {
  const { orgId, orgRole } = await auth();
  if (!orgId) return [];
  return [{ id: orgId, role: orgRole || 'member' }];
}

/**
 * Check if user is in a specific organization.
 */
export async function isInOrganization(orgId: string): Promise<boolean> {
  const memberships = await getOrgMemberships();
  return memberships.some((m) => m.id === orgId);
}
