/**
 * Sanity environment configuration.
 *
 * `projectId` is intentionally optional: when it is not set the site falls
 * back to the hardcoded content in `src/content/*`, so the build and the
 * live site never break before the CMS is connected. Set the three
 * NEXT_PUBLIC_SANITY_* env vars (and, for the Studio to write, a token) to
 * activate the CMS.
 */

export const apiVersion = process.env.NEXT_PUBLIC_SANITY_API_VERSION || '2024-10-01';

export const dataset = process.env.NEXT_PUBLIC_SANITY_DATASET || 'production';

export const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID || '';

/** True once a real Sanity project is wired up via env vars. */
export const sanityConfigured = projectId.length > 0;

/** Server-only read token — enables drafts / faster CDN bypass when set. */
export const readToken = process.env.SANITY_API_READ_TOKEN || '';
