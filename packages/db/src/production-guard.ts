/**
 * Refuses to connect a non-production process to the production database.
 *
 * Why: a developer's local `.env.local` once held the production DATABASE_URL, so `next dev` (and any
 * script importing this client) read and wrote production data. `drizzle.config.ts` and the integration
 * tests already refuse that host; the shared client did not.
 *
 * The rule: if the connection string's host is the production Neon endpoint and NODE_ENV is not
 * 'production', throw - unless ALLOW_PRODUCTION_DB_OPERATIONS=yes is set explicitly for this command.
 * Vercel production/preview builds and `next start` run with NODE_ENV=production, so deployed behaviour
 * is unchanged. The endpoint id is a hostname, not a credential (it is already public in the tests).
 */
export const PRODUCTION_DB_ENDPOINT = 'ep-damp-flower-ayp7i2gc';

export function isProductionDatabase(connectionString: string): boolean {
  try {
    const host = new URL(connectionString).hostname;
    return (
      host === `${PRODUCTION_DB_ENDPOINT}-pooler` ||
      host.startsWith(`${PRODUCTION_DB_ENDPOINT}.`) ||
      host.startsWith(`${PRODUCTION_DB_ENDPOINT}-pooler.`)
    );
  } catch {
    return connectionString.includes(PRODUCTION_DB_ENDPOINT);
  }
}

export function assertNotProductionFromDev(
  connectionString: string,
  env: { NODE_ENV?: string; ALLOW_PRODUCTION_DB_OPERATIONS?: string },
): void {
  if (!isProductionDatabase(connectionString)) return;
  if (env.NODE_ENV === 'production') return;
  if (env.ALLOW_PRODUCTION_DB_OPERATIONS === 'yes') return;
  throw new Error(
    'Refusing to connect to the PRODUCTION database from a non-production process. ' +
      'Point DATABASE_URL at an isolated Neon branch. To override deliberately for one command, ' +
      'set ALLOW_PRODUCTION_DB_OPERATIONS=yes on that command only (never in a .env file).',
  );
}
