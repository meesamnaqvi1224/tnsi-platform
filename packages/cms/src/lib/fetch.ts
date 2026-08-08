import 'server-only';
import { client, sanityConfigured } from './client';

/**
 * Server-side Sanity fetch. Returns `null` when the CMS is not configured
 * so callers can fall back to hardcoded content. Never throws the site
 * down: on any query error it logs and returns null.
 */
export async function sanityFetch<T>(
  query: string,
  params: Record<string, unknown> = {},
): Promise<T | null> {
  if (!sanityConfigured) return null;
  try {
    // Use type assertion for Next.js-specific fetch options (ISR/revalidation)
    return (await client.fetch(query, params, {
      next: { revalidate: 60, tags: ['sanity'] },
    } as unknown as Parameters<typeof client.fetch>[2])) as T | null;
  } catch (error) {
    console.error('[sanity] fetch failed:', error);
    return null;
  }
}
