import { createClient } from 'next-sanity';
import { apiVersion, dataset, projectId, readToken, sanityConfigured } from '../env';

/**
 * Read client for the site. Server-side reads use the read token when
 * present (works whether the dataset is public or private); otherwise it
 * falls back to the public CDN. Guarded everywhere by `sanityConfigured`.
 */
export const client = createClient({
  projectId: projectId || 'placeholder',
  dataset,
  apiVersion,
  useCdn: !readToken,
  token: readToken || undefined,
  perspective: 'published',
});

export { sanityConfigured };
