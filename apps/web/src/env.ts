import { z } from '@tnsi/validation';

/**
 * The site's own public URL, used for canonical links, Open Graph URLs and
 * JSON-LD. `NEXT_PUBLIC_SITE_URL` always wins (it is set for Production). On a
 * Vercel Preview it is not set, so the deployment's own address is used instead
 * of a `localhost` default that would otherwise leak into every preview page.
 * Anywhere else (local development, tests) it stays undefined and the schema's
 * `localhost` default applies, exactly as before.
 */
export function resolveSiteUrl(source: {
  NEXT_PUBLIC_SITE_URL?: string;
  VERCEL_ENV?: string;
  VERCEL_BRANCH_URL?: string;
  VERCEL_URL?: string;
}): string | undefined {
  if (source.NEXT_PUBLIC_SITE_URL) return source.NEXT_PUBLIC_SITE_URL;
  if (source.VERCEL_ENV === 'preview') {
    const host = source.VERCEL_BRANCH_URL || source.VERCEL_URL;
    if (host) return `https://${host}`;
  }
  return undefined;
}

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  NEXT_PUBLIC_SITE_URL: z.string().url().default('http://localhost:3000'),
});

export const env = envSchema.parse({
  NODE_ENV: process.env.NODE_ENV,
  NEXT_PUBLIC_SITE_URL: resolveSiteUrl({
    NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
    VERCEL_ENV: process.env.VERCEL_ENV,
    VERCEL_BRANCH_URL: process.env.VERCEL_BRANCH_URL,
    VERCEL_URL: process.env.VERCEL_URL,
  }),
});
