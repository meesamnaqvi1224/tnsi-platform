#!/usr/bin/env node
/**
 * Baselines drizzle's migration ledger on an ISOLATED test database whose tables already exist at the
 * state of migration 0012 but whose ledger (drizzle.__drizzle_migrations) is empty, so that
 * `drizzle-kit migrate` applies only what is newer (0013) instead of replaying from 0000.
 *
 * drizzle applies a migration only when its journal timestamp is newer than the LATEST ledger row, so
 * one row for 0012 (its file hash and journal timestamp) is the whole baseline.
 *
 * Dry run by default (reads only). Writes ONE ledger row only with --apply. Same target rules as the other
 * scripts: TNSI_TEST_DATABASE_URL only, no credential printed, refuses production. It also refuses unless
 * the database looks exactly as described (empty ledger, 0012-era tables present, no is_primary column).
 */
import postgres from 'postgres';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const PROD = 'ep-damp-flower-ayp7i2gc';
const APPLY = process.argv.includes('--apply');
const HERE = path.dirname(fileURLToPath(import.meta.url));
const DRIZZLE_DIR = path.join(HERE, '../drizzle');

const refuse = (why) => {
  console.error(`\nREFUSING TO RUN: ${why}\n`);
  process.exit(2);
};
const raw = process.env.TNSI_TEST_DATABASE_URL;
if (!raw) refuse('TNSI_TEST_DATABASE_URL is not set.');
let url;
try {
  url = new URL(raw);
} catch {
  refuse('TNSI_TEST_DATABASE_URL is not a valid database URL.');
}
if (url.hostname.includes(PROD)) refuse('the target is the production database.');
for (const name of ['DATABASE_URL', 'DATABASE_URL_UNPOOLED']) {
  try {
    const other = new URL(process.env[name] ?? '').hostname;
    if (
      other.split('.')[0].replace(/-pooler$/, '') ===
      url.hostname.split('.')[0].replace(/-pooler$/, '')
    ) {
      refuse(`the target is the same endpoint as ${name} in this shell.`);
    }
  } catch {
    /* not set */
  }
}
const endpoint = url.hostname.split('.')[0].replace(/-pooler$/, '');
const declared = (process.env.TNSI_TEST_DATABASE_ENDPOINT ?? '')
  .trim()
  .toLowerCase()
  .replace(/-pooler$/, '');
const isLocal = ['localhost', '127.0.0.1', '::1', '[::1]'].includes(url.hostname);
if (!isLocal) {
  if (!url.hostname.endsWith('.neon.tech'))
    refuse('not localhost or a Neon host; cannot identify it as a test database.');
  if (declared !== endpoint)
    refuse(
      "set TNSI_TEST_DATABASE_ENDPOINT to this database's endpoint id (it must match the URL).",
    );
}

// The row to write: migration 0012's file hash (as drizzle computes it) and journal timestamp.
const journal = JSON.parse(readFileSync(path.join(DRIZZLE_DIR, 'meta/_journal.json'), 'utf8'));
const entry = journal.entries.find((e) => e.tag.startsWith('0012_'));
if (!entry) refuse('migration 0012 is not in the journal.');
const hash = createHash('sha256')
  .update(readFileSync(path.join(DRIZZLE_DIR, `${entry.tag}.sql`)))
  .digest('hex');
console.log(`Target: ${isLocal ? 'localhost' : `Neon endpoint ${endpoint}`}`);
console.log(
  `Baseline row: ${entry.tag}  (journal timestamp ${entry.when}, hash ${hash.slice(0, 12)}...)`,
);

const sql = postgres(raw, { max: 1, onnotice: () => {}, connect_timeout: 20 });
try {
  const [{ n: ledgerRows }] =
    await sql`select count(*)::int as n from drizzle.__drizzle_migrations`;
  const tables = (await sql`select tablename from pg_tables where schemaname = 'public'`).map(
    (t) => t.tablename,
  );
  const [{ n: hasPrimary }] = await sql`select count(*)::int as n from information_schema.columns
    where table_schema = 'public' and table_name = 'check_ins' and column_name = 'is_primary'`;
  const [{ n: hasDeletedAt }] = await sql`select count(*)::int as n from information_schema.columns
    where table_schema = 'public' and table_name = 'users' and column_name = 'deleted_at'`;

  if (ledgerRows !== 0)
    refuse(`the ledger already has ${ledgerRows} row(s); this only baselines an EMPTY ledger.`);
  for (const t of ['users', 'check_ins', 'practices', 'trial_claims', 'crm_outbox']) {
    if (!tables.includes(t))
      refuse(`expected table "${t}" is missing; the schema is not at the 0012 state.`);
  }
  if (hasDeletedAt !== 1)
    refuse('users.deleted_at is missing; the schema is not at the 0012 state.');
  if (hasPrimary !== 0)
    refuse('check_ins.is_primary already exists; 0013 appears to be applied already.');
  console.log('Checks: empty ledger, 0012-era tables present, check_ins.is_primary absent.');

  if (!APPLY) {
    console.log('\nDRY RUN: nothing was written. Re-run with --apply to insert the baseline row.');
  } else {
    await sql.begin(async (tx) => {
      await tx`insert into drizzle.__drizzle_migrations (hash, created_at) values (${hash}, ${entry.when})`;
    });
    console.log(
      '\nApplied: one ledger row inserted. Now run drizzle-kit migrate: it will apply only 0013.',
    );
  }
} finally {
  await sql.end({ timeout: 5 }).catch(() => {});
}
