import { createClient } from 'next-sanity';
import { apiVersion, dataset, projectId, sanityConfigured } from '@/sanity/env';

/**
 * Read client. When Sanity is not configured we still construct a client
 * with a placeholder projectId so imports don't throw at module load — the
 * data layer guards on `sanityConfigured` before ever calling it.
 */
export const client = createClient({
  projectId: projectId || 'placeholder',
  dataset,
  apiVersion,
  useCdn: true,
});

export { sanityConfigured };
