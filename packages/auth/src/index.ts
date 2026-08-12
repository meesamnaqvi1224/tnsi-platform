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
 * DOES NOT CONTAIN:
 * - Subscription/business authorization logic
 * - Stripe integration
 * - Entitlement computation (that's in the API layer using @tnsi/db)
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

export const VERSION = '0.1.0';
