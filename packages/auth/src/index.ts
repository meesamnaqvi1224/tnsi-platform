/**
 * @tnsi/auth - Shared authentication authority for TNSI platform.
 *
 * This package is the single source of truth for:
 * - Clerk JWT verification
 * - Clerk webhook handling
 * - User synchronization (Clerk → PostgreSQL)
 * - Authentication error types
 * - Session utilities
 *
 * Also contains the entitlement authorization *decision* layer
 * (`authorize/entitlements`): a pure function of an entitlement record and
 * a requirement, with no database access of its own.
 *
 * DOES NOT CONTAIN:
 * - Stripe integration
 * - Fetching/computing the entitlement record itself (that's the API
 *   layer, using @tnsi/db — see apps/web/src/lib/auth-api.ts)
 */

// Types
export * from './types';

// Errors
export * from './errors/auth';

// JWT Verification
export * from './verify/jwt';

// Webhook Verification
export * from './verify/webhook';

// User Sync
export * from './sync/user';

// Web Client Helpers (Next.js)
export * from './client/web';

// Server Client Helpers (Backend)
export * from './client/server';

// Session Helpers
export * from './session/helpers';

// Entitlement Authorization
export * from './authorize/entitlements';

export const VERSION = '0.1.0';
