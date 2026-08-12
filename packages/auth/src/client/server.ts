/**
 * Clerk server-side client for backend operations.
 * Uses @clerk/backend for server-only operations.
 */

import { createClerkClient } from '@clerk/backend';
import type { User as ClerkUser } from '@clerk/backend';

/**
 * Clerk server client singleton.
 */
let serverClient: ReturnType<typeof createClerkClient> | null = null;

/**
 * Get or create the Clerk server client.
 */
export function getServerClerkClient() {
  if (!serverClient) {
    const secretKey = process.env.CLERK_SECRET_KEY;
    if (!secretKey) {
      throw new Error('CLERK_SECRET_KEY environment variable is not set');
    }
    serverClient = createClerkClient({ secretKey });
  }
  return serverClient;
}

/**
 * Get a user from Clerk by their Clerk user ID.
 */
export async function getClerkUser(clerkUserId: string) {
  const client = getServerClerkClient();
  return client.users.getUser(clerkUserId);
}

/**
 * Get multiple users from Clerk by their IDs.
 */
export async function getClerkUsers(clerkUserIds: string[]) {
  const client = getServerClerkClient();
  const result = await client.users.getUserList({ userId: clerkUserIds });
  return result.data;
}

/**
 * Revoke a specific session.
 */
export async function revokeSession(sessionId: string): Promise<void> {
  const client = getServerClerkClient();
  await client.sessions.revokeSession(sessionId);
}

/**
 * Update user metadata in Clerk.
 */
export async function updateClerkUserMetadata(
  clerkUserId: string,
  publicMetadata?: Record<string, unknown>,
  privateMetadata?: Record<string, unknown>,
) {
  const client = getServerClerkClient();
  return client.users.updateUser(clerkUserId, {
    publicMetadata,
    privateMetadata,
  });
}

/**
 * Delete a user from Clerk (use with caution).
 */
export async function deleteClerkUser(clerkUserId: string): Promise<void> {
  const client = getServerClerkClient();
  await client.users.deleteUser(clerkUserId);
}
