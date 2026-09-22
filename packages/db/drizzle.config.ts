import { defineConfig } from 'drizzle-kit';

/**
 * The host fragment of the production Neon database - not a credential,
 * just the identifying part of the URL, needed here so this file can
 * recognize "you're about to target production" before drizzle-kit ever
 * connects. See docs/TNSI_Somatic_Card_Migration_Incident.md for why
 * this check exists: a prior migration run intended for an isolated
 * test branch silently landed on production instead, because
 * `packages/db/.env` (gitignored, local-only) sets `DATABASE_URL_UNPOOLED`
 * to this host, and that variable is - deliberately, for legitimate
 * reasons - checked before `DATABASE_URL` below (unpooled connections
 * are the documented, correct choice for DDL; see `.env.example`'s own
 * "Optional: Unpooled connection for migrations" comment). That
 * precedence is being kept, not removed - the fix is the guard, not
 * reordering these two.
 */
const PRODUCTION_DB_HOST = 'ep-damp-flower-ayp7i2gc';

/**
 * Resolves the database URL for every drizzle-kit command (generate,
 * migrate, push, studio) run from this package.
 *
 * `TNSI_TEST_DATABASE_URL` is the one variable this file trusts above
 * everything else, specifically *because* nothing in this repository's
 * gitignored `.env`/`.env.local` files ever sets it - unlike
 * `DATABASE_URL`/`DATABASE_URL_UNPOOLED`, there is no local file that
 * can silently pre-fill it, so an inline shell override
 * (`TNSI_TEST_DATABASE_URL=<isolated branch> pnpm db:migrate`) always
 * wins, unambiguously, every time. Use this whenever testing against
 * anything other than the real database.
 *
 * If no explicit test URL is given and the resolved URL points at
 * production, the command refuses to run unless
 * `ALLOW_PRODUCTION_DB_OPERATIONS=yes` is also explicitly set - on
 * purpose, every time, not something to leave permanently on in a
 * local `.env` (that would just recreate the same silent-default
 * problem this exists to prevent).
 */
function resolveDatabaseUrl(): string {
  const explicitTestUrl = process.env.TNSI_TEST_DATABASE_URL;
  if (explicitTestUrl) return explicitTestUrl;

  const url =
    process.env.DATABASE_URL_UNPOOLED ||
    process.env.DATABASE_URL ||
    'postgresql://postgres:postgres@localhost:5432/tnsi_dev';

  const targetsProduction = url.includes(PRODUCTION_DB_HOST);
  const productionAcknowledged = process.env.ALLOW_PRODUCTION_DB_OPERATIONS === 'yes';

  if (targetsProduction && !productionAcknowledged) {
    throw new Error(
      '\n\nRefusing to run drizzle-kit against the production database without ' +
        'explicit acknowledgement.\n\n' +
        'To target an isolated/test database instead, set TNSI_TEST_DATABASE_URL, e.g.:\n' +
        '  TNSI_TEST_DATABASE_URL="postgresql://..." pnpm db:migrate\n\n' +
        'If you really do mean to run this against production right now, set:\n' +
        '  ALLOW_PRODUCTION_DB_OPERATIONS=yes\n' +
        'explicitly for this command (not permanently in a .env file - that would ' +
        'silently defeat this check the same way DATABASE_URL_UNPOOLED did before).\n\n' +
        'See docs/TNSI_Somatic_Card_Migration_Incident.md for the incident this guards against.\n',
    );
  }

  return url;
}

export default defineConfig({
  schema: './src/schema/*.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url: resolveDatabaseUrl(),
  },
  verbose: true,
  strict: true,
});
