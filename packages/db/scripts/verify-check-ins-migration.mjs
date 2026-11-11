#!/usr/bin/env node
/**
 * READ-ONLY check that migration 0013 (multiple daily check-ins) is applied on an isolated test database.
 *
 *   TNSI_TEST_DATABASE_URL='<isolated database url>' \
 *   TNSI_TEST_DATABASE_ENDPOINT='<its Neon endpoint id, e.g. ep-cool-name-123456>' \
 *     node packages/db/scripts/verify-check-ins-migration.mjs
 *
 * Uses the same target rules as rehearse-check-ins-migration.mjs: only TNSI_TEST_DATABASE_URL (never a
 * .env file), no credential is printed, and it refuses production or any target it cannot positively
 * identify as isolated. It only runs SELECTs inside a READ ONLY transaction and changes nothing.
 */
import postgres from 'postgres';

const PRODUCTION_ENDPOINT = 'ep-damp-flower-ayp7i2gc';
// ---------------------------------------------------------------- output (never any credentials)
const results = [];
let secretsToScrub = [];
function scrub(text) {
  let out = String(text);
  for (const s of secretsToScrub) if (s) out = out.split(s).join('***');
  return out;
}
function log(line = '') {
  console.log(scrub(line));
}
function check(name, ok, detail = '') {
  results.push({ name, ok });
  log(`${ok ? '  PASS' : '  FAIL'}  ${name}${!ok && detail ? `  (${detail})` : ''}`);
}
function section(title) {
  log(`\n== ${title}`);
}
function refuse(reason) {
  console.error(`\nREFUSING TO RUN: ${reason}\n`);
  process.exit(2);
}

// ---------------------------------------------------------------- 1. identify the target
function endpointIdOf(host) {
  return host.split('.')[0].replace(/-pooler$/, '');
}
function parseUrl(raw, label) {
  try {
    return new URL(raw);
  } catch {
    refuse(`${label} is not a valid database URL.`);
  }
}

const rawUrl = process.env.TNSI_TEST_DATABASE_URL;
if (!rawUrl) {
  refuse(
    'TNSI_TEST_DATABASE_URL is not set. Set it (and TNSI_TEST_DATABASE_ENDPOINT) in this terminal; ' +
      'this script never reads credentials from any .env file.',
  );
}
const url = parseUrl(rawUrl, 'TNSI_TEST_DATABASE_URL');
if (!/^postgres(ql)?:$/.test(url.protocol))
  refuse('TNSI_TEST_DATABASE_URL is not a postgres:// URL.');
secretsToScrub = [url.password, decodeURIComponent(url.password), url.username, rawUrl].filter(
  Boolean,
);

const host = url.hostname.toLowerCase();
const endpointId = endpointIdOf(host);
const isLocal = ['localhost', '127.0.0.1', '::1', '[::1]'].includes(host);
const isNeon = host.endsWith('.neon.tech');

if (host.includes(PRODUCTION_ENDPOINT)) refuse('the target is the production database.');
for (const name of ['DATABASE_URL', 'DATABASE_URL_UNPOOLED']) {
  const other = process.env[name];
  if (!other) continue;
  let otherHost = '';
  try {
    otherHost = new URL(other).hostname.toLowerCase();
  } catch {
    continue;
  }
  if (endpointIdOf(otherHost) === endpointId) {
    refuse(`the target is the same database endpoint as ${name} in this shell.`);
  }
}
if (!isLocal && !isNeon) {
  refuse(
    'the target host is neither localhost nor a Neon host, so it cannot be identified as a test database.',
  );
}
if (isNeon) {
  const declared = (process.env.TNSI_TEST_DATABASE_ENDPOINT ?? '').trim().toLowerCase();
  if (!declared) {
    refuse(
      'set TNSI_TEST_DATABASE_ENDPOINT to the endpoint id of the isolated database you intend to use ' +
        '(the "ep-..." part of its host). This is how the target is positively identified.',
    );
  }
  if (declared.replace(/-pooler$/, '') !== endpointId) {
    refuse('TNSI_TEST_DATABASE_ENDPOINT does not match the endpoint in TNSI_TEST_DATABASE_URL.');
  }
}

log('TNSI check-in migration check (read-only)');
log(
  `Target: ${isLocal ? 'localhost' : `Neon endpoint ${endpointId}`} (identified as an isolated test database)`,
);

const sql = postgres(rawUrl, { onnotice: () => {}, idle_timeout: 5, connect_timeout: 20, max: 1 });
let exitCode = 0;
try {
  await sql.begin('read only', async (tx) => {
    const [{ db }] = await tx`select current_database() as db`;
    log(`Connected: database "${db}"`);

    const cols =
      await tx`select column_name, data_type, is_nullable, column_default from information_schema.columns
      where table_schema = 'public' and table_name = 'check_ins' and column_name = 'is_primary'`;
    check('check_ins.is_primary exists', cols.length === 1);
    check(
      'is_primary is boolean, NOT NULL, default true',
      cols[0]?.data_type === 'boolean' &&
        cols[0]?.is_nullable === 'NO' &&
        /true/.test(cols[0]?.column_default ?? ''),
    );

    const idx =
      await tx`select indexname, indexdef from pg_indexes where schemaname = 'public' and tablename = 'check_ins'`;
    const primaryIdx = idx.find((r) => r.indexname === 'unique_check_ins_primary_user_date');
    check(
      'partial unique index on (user_id, completed_date) WHERE is_primary exists',
      !!primaryIdx &&
        /UNIQUE/i.test(primaryIdx.indexdef) &&
        /is_primary/.test(primaryIdx.indexdef.split('WHERE')[1] ?? ''),
    );
    check(
      'lookup index idx_check_ins_user_date exists',
      idx.some((r) => r.indexname === 'idx_check_ins_user_date'),
    );

    const cons = await tx`select c.conname from pg_constraint c
      join pg_class t on t.oid = c.conrelid join pg_namespace n on n.oid = t.relnamespace
      where n.nspname = 'public' and t.relname = 'check_ins'`;
    check(
      'old one-row-per-day constraint is gone',
      !cons.some((r) => r.conname === 'unique_check_ins_user_date'),
    );

    const [{ extra }] = await tx`select count(*)::int as extra from (
      select user_id, completed_date from check_ins where is_primary group by 1, 2 having count(*) > 1) d`;
    check('never more than one primary per member per day', extra === 0);

    try {
      const [{ n }] = await tx`select count(*)::int as n from drizzle.__drizzle_migrations`;
      log(
        `  info  migrations recorded by drizzle: ${n} (a database migrated through 0013 shows 14)`,
      );
    } catch {
      log(
        '  info  drizzle.__drizzle_migrations not readable here (not required for the checks above)',
      );
    }
  });
} catch (err) {
  exitCode = 1;
  console.error(
    scrub(`Stopped on an error: ${err?.code ? `[${err.code}] ` : ''}${err?.message ?? err}`),
  );
} finally {
  await sql.end({ timeout: 5 }).catch(() => {});
}
const failed = results.filter((r) => !r.ok).length;
log(`\nResult: ${results.length - failed} passed, ${failed} failed.`);
process.exit(exitCode || (failed > 0 ? 1 : 0));
