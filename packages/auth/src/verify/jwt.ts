/**
 * Clerk JWT verification utilities.
 * Uses @clerk/backend for secure JWT verification with JWKS caching.
 * Server-side only - uses Node.js crypto APIs.
 */

import { createClerkClient, verifyToken as clerkVerifyToken } from '@clerk/backend';
import { TokenInvalidError, SessionRevokedError } from '../errors/auth';
import type { CurrentUser } from '../types';

/**
 * Clerk client instance for token verification.
 * Uses JWKS caching internally.
 */
let clerkClient: ReturnType<typeof createClerkClient> | null = null;

/**
 * Get or create the Clerk client instance.
 * Uses singleton pattern for JWKS caching.
 */
function getClerkClient(): ReturnType<typeof createClerkClient> {
  if (!clerkClient) {
    const secretKey = process.env.CLERK_SECRET_KEY;
    if (!secretKey) {
      throw new Error('CLERK_SECRET_KEY environment variable is not set');
    }
    clerkClient = createClerkClient({ secretKey });
  }
  return clerkClient;
}

/**
 * Verified JWT payload from Clerk.
 * Only includes standard JWT claims that are guaranteed to be present.
 */
export interface VerifiedTokenPayload {
  sub: string; // Clerk user ID
  sid?: string; // Session ID (optional)
  org_id?: string; // Organization ID (if applicable)
  azp?: string; // Authorized party
  exp: number; // Expiration timestamp
  iat: number; // Issued at timestamp
  nbf?: number; // Not before timestamp
  iss: string; // Issuer
  aud: string | string[]; // Audience
}

/**
 * Verify a Clerk JWT token.
 * Returns the verified payload or throws an AuthError.
 *
 * @param token - The JWT token string (without 'Bearer ' prefix)
 * @returns Verified token payload
 * @throws TokenInvalidError if token is invalid, expired, or malformed
 * @throws SessionRevokedError if session was revoked
 */
export async function verifyToken(token: string): Promise<VerifiedTokenPayload> {
  const client = getClerkClient();

  try {
    const payload = await clerkVerifyToken(token, {
      secretKey: process.env.CLERK_SECRET_KEY!,
    });

    // Additional validation
    if (!payload.sub) {
      throw new Error('Token missing subject (sub) claim');
    }

    return {
      sub: payload.sub,
      sid: payload.sid,
      org_id: payload.org_id,
      azp: payload.azp,
      exp: payload.exp,
      iat: payload.iat,
      nbf: payload.nbf,
      iss: payload.iss,
      aud: payload.aud,
    } as VerifiedTokenPayload;
  } catch (error) {
    if (error instanceof Error) {
      // Check for specific Clerk error types
      const message = error.message.toLowerCase();
      if (message.includes('expired') || message.includes('exp')) {
        throw new TokenInvalidError('Token has expired');
      }
      if (message.includes('revoked') || message.includes('revoke')) {
        throw new SessionRevokedError('Session has been revoked');
      }
      if (message.includes('signature') || message.includes('invalid')) {
        throw new TokenInvalidError('Token signature verification failed');
      }
    }
    throw new TokenInvalidError('Token verification failed');
  }
}

/**
 * Verify a token and return a CurrentUser if valid.
 * Returns null if token is missing or invalid (does not throw).
 */
export async function verifyTokenSafe(token: string | undefined): Promise<CurrentUser | null> {
  if (!token) {
    return null;
  }

  try {
    const payload = await verifyToken(token);
    return {
      id: '', // Will be populated by the caller after DB lookup
      clerkUserId: payload.sub,
      email: '', // Will be populated by the caller
      fullName: null,
      avatarUrl: null,
    };
  } catch {
    return null;
  }
}

/**
 * Extract token from Authorization header.
 * Returns the token string without 'Bearer ' prefix, or null if missing/invalid.
 */
export function extractBearerToken(authHeader: string | null): string | null {
  if (!authHeader) {
    return null;
  }
  const parts = authHeader.split(' ');
  const [scheme, token] = parts;
  if (parts.length !== 2 || scheme?.toLowerCase() !== 'bearer') {
    return null;
  }
  return token ?? null;
}

/**
 * Verify token from Authorization header.
 * Returns verified payload or throws AuthError.
 */
export async function verifyAuthHeader(authHeader: string | null): Promise<VerifiedTokenPayload> {
  const token = extractBearerToken(authHeader);
  if (!token) {
    const { UnauthenticatedError } = await import('../errors/auth');
    throw new UnauthenticatedError('Missing or invalid Authorization header');
  }
  return verifyToken(token);
}

/**
 * Create a Clerk client for server-side operations.
 * Use for user management, session revocation, etc.
 */
export function createServerClerkClient() {
  return getClerkClient();
}
