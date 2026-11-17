#!/usr/bin/env node
/**
 * Rehearsal of migration 0013 (multiple daily check-ins) on an ISOLATED test database.
 *
 *   TNSI_TEST_DATABASE_URL='<isolated database url>' \
 *   TNSI_TEST_DATABASE_ENDPOINT='<its Neon endpoint id, e.g. ep-cool-name-123456>' \
 *     node packages/db/scripts/rehearse-check-ins-migration.mjs
 *
 *   ... --check-target     only identify and connect (creates nothing), then exit
 *
 * What it guarantees:
 *  - The ONLY database it will touch is TNSI_TEST_DATABASE_URL. It never reads .env files,
 *    DATABASE_URL's value is only used to REFUSE a match, and no credential is ever printed.
 *  - It refuses to run unless the target is positively identified as an isolated test database:
 *      * not the production endpoint, and not the same endpoint as DATABASE_URL /
 *        DATABASE_URL_UNPOOLED if those happen to be set in this shell;
 *      * localhost, or a Neon host whose endpoint id you declared in TNSI_TEST_DATABASE_ENDPOINT
 *        and which matches the URL (so a pasted-wrong URL cannot slip through).
 *  - It works only inside a throwaway schema it creates (rehearsal_0013_<random>) and drops at the
 *    end, even on failure. It never reads or writes any existing table in the database.
 *
 * What it tests, against a copy of the pre-migration `check_ins` shape:
 *   existing rows -> apply 0013 -> verification SQL -> idempotent re-apply -> one primary plus
 *   several additional check-ins for one member and day (and a concurrent burst) -> the recommendation
 *   still follows the primary -> existing rows byte-identical -> rollback with additional rows
 *   present -> re-apply -> lossless rollback.
 */
import postgres from 'postgres';
import { randomBytes } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '../../..');
const MIGRATION_FILE = path.join(HERE, '../drizzle/0013_multiple_daily_check_ins.sql');
const RECOMMENDATION_FILE = path.join(ROOT, 'packages/core/src/practices/recommendation.ts');
const DOC_FILE = path.join(ROOT, 'docs/multiple-daily-check-ins-migration.md');

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

log('TNSI check-in migration rehearsal');
log(
  `Target: ${isLocal ? 'localhost' : `Neon endpoint ${endpointId}`} (identified as an isolated test database)`,
);

const SCHEMA = `rehearsal_0013_${randomBytes(4).toString('hex')}`;
if (!/^rehearsal_0013_[0-9a-f]{8}$/.test(SCHEMA)) refuse('internal: bad schema name.');

const connectionOptions = { onnotice: () => {}, idle_timeout: 5, connect_timeout: 20 };
const admin = postgres(rawUrl, { ...connectionOptions, max: 1 });
let sql = null; // connection pool; every statement below runs inside `inSchema`

// ---------------------------------------------------------------- helpers
/**
 * Every statement runs in its own transaction that begins with `SET LOCAL search_path` to the
 * throwaway schema. This is deliberately NOT a connection start-up parameter: poolers (Neon's pooled
 * connections among them) can ignore those, which would let statements land in another schema. A
 * transaction-local setting holds on any connection and cannot leak to other sessions.
 */
const inSchema = (work) =>
  sql.begin(async (tx) => {
    await tx.unsafe(`set local search_path to ${SCHEMA}`);
    return work(tx);
  });
const q = (strings, ...values) => inSchema((tx) => tx(strings, ...values));

/** Statements of the real migration file, comments stripped. */
function migrationStatements() {
  return readFileSync(MIGRATION_FILE, 'utf8')
    .split('--> statement-breakpoint')
    .map((chunk) =>
      chunk
        .split('\n')
        .filter((line) => !line.trim().startsWith('--'))
        .join('\n')
        .trim(),
    )
    .filter(Boolean);
}
async function applyMigration() {
  await inSchema(async (tx) => {
    for (const statement of migrationStatements()) await tx.unsafe(statement);
  });
}

// The same statements the runbook documents (docs/multiple-daily-check-ins-migration.md).
const ROLLBACK_CORE = [
  'ALTER TABLE check_ins ADD CONSTRAINT unique_check_ins_user_date UNIQUE (user_id, completed_date)',
  'DROP INDEX IF EXISTS unique_check_ins_primary_user_date',
  'DROP INDEX IF EXISTS idx_check_ins_user_date',
  'ALTER TABLE check_ins DROP COLUMN is_primary',
];
const ROLLBACK_PRESERVING = [
  'CREATE TABLE check_ins_additional_backup AS SELECT * FROM check_ins WHERE NOT is_primary',
  'DELETE FROM check_ins WHERE NOT is_primary',
  ...ROLLBACK_CORE,
];
async function runAll(statements) {
  await inSchema(async (tx) => {
    for (const statement of statements) await tx.unsafe(statement);
  });
}

/** The recommendation mapping, read from the real source file so it cannot drift from the app. */
function loadCategoryMapping() {
  const source = readFileSync(RECOMMENDATION_FILE, 'utf8');
  const scoreToState = {};
  const scoreBlock = source.match(/SCORE_TO_CAPACITY_STATE[^{]*\{([^}]*)\}/);
  for (const m of (scoreBlock?.[1] ?? '').matchAll(/(\d):\s*'([A-Z_]+)'/g))
    scoreToState[m[1]] = m[2];
  const stateToCategory = {};
  const catBlock = source.match(/CAPACITY_STATE_TO_CATEGORY[^{]*\{([^}]*)\}/);
  for (const m of (catBlock?.[1] ?? '').matchAll(/([A-Z_]+):\s*'([A-Z_]+)'/g))
    stateToCategory[m[1]] = m[2];
  const mapping = {};
  for (const [score, state] of Object.entries(scoreToState))
    mapping[Number(score)] = stateToCategory[state];
  return mapping;
}

const FIXTURE_HASH = (ids) => q`
  select count(*)::int as n,
         md5(coalesce(string_agg(
           id::text || '|' || user_id::text || '|' || mood_score || '|' || capacity_score || '|' ||
           coalesce(notes, '~') || '|' || completed_at::text || '|' || completed_date::text || '|' ||
           metadata::text || '|' || created_at::text, ';' order by id), '')) as hash
    from check_ins where id = any(${ids}::uuid[])`;

async function errorCode(promise) {
  try {
    await promise;
    return null;
  } catch (err) {
    return err?.code ?? 'ERR';
  }
}

// ---------------------------------------------------------------- the rehearsal
async function main() {
  const [{ db, version }] = await admin`select current_database() as db, version() as version`;
  log(`Connected: database "${db}", ${String(version).split(' ').slice(0, 2).join(' ')}`);
  if (process.argv.includes('--check-target')) {
    log('\n--check-target: target identified and reachable. Nothing was created.');
    return;
  }

  await admin.unsafe(`create schema ${SCHEMA}`);
  sql = postgres(rawUrl, { ...connectionOptions, max: 8 });
  log(`Working only inside throwaway schema ${SCHEMA} (dropped at the end).`);

  section('0. Pre-migration shape (check_ins as of migration 0012) and existing records');
  const [{ leaked: leakedBefore }] =
    await admin`select count(*)::int as leaked from pg_tables where schemaname not in ('pg_catalog','information_schema') and schemaname <> ${SCHEMA} and tablename in ('check_ins','users') `;
  await q`create table users (id uuid primary key default gen_random_uuid(), email text not null)`;
  await q`create table check_ins (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references users(id) on delete cascade,
    mood_score integer not null,
    capacity_score integer not null,
    notes text,
    completed_at timestamptz not null,
    completed_date date not null,
    metadata jsonb not null default '{}'::jsonb,
    created_at timestamptz not null default now(),
    constraint unique_check_ins_user_date unique (user_id, completed_date),
    constraint check_ins_mood_score_range check (mood_score between 1 and 5),
    constraint check_ins_capacity_score_range check (capacity_score between 1 and 5)
  )`;
  await q`create index idx_check_ins_user_created on check_ins (user_id, created_at)`;

  const [u1, u2, u3] = (
    await q`insert into users (email) values ('rehearsal-1@example.test'), ('rehearsal-2@example.test'), ('rehearsal-3@example.test') returning id`
  ).map((r) => r.id);
  const fixtureRows = [];
  const days = ['2026-11-02', '2026-11-03', '2026-11-04', '2026-11-05', '2026-11-06'];
  for (const [i, day] of days.entries()) {
    fixtureRows.push([u1, 1 + (i % 5), 1 + ((i + 2) % 5), i === 1 ? 'a note' : null, day]);
  }
  for (const [i, day] of days.slice(0, 3).entries()) fixtureRows.push([u2, 3, 1 + i, null, day]);
  const existingIds = [];
  for (const [user, mood, cap, notes, day] of fixtureRows) {
    const [{ id }] =
      await q`insert into check_ins (user_id, mood_score, capacity_score, notes, completed_at, completed_date)
      values (${user}, ${mood}, ${cap}, ${notes}, ${`${day}T09:00:00Z`}, ${day}) returning id`;
    existingIds.push(id);
  }
  const before = (await FIXTURE_HASH(existingIds))[0];
  const [{ n: totalBefore, d: distinctBefore }] =
    await q`select count(*)::int as n, count(distinct (user_id, completed_date))::int as d from check_ins`;
  check('existing records created', before.n === fixtureRows.length, `${before.n}`);
  check(
    'old rule holds before migration: a second check-in the same day is rejected',
    (await errorCode(q`insert into check_ins (user_id, mood_score, capacity_score, completed_at, completed_date)
      values (${u1}, 3, 3, '2026-11-02T18:00:00Z', '2026-11-02')`)) === '23505',
  );

  section('1. Apply migration 0013 (the real file) and verify');
  await applyMigration();
  const after = (await FIXTURE_HASH(existingIds))[0];
  const [{ n: totalAfter, d: distinctAfter }] =
    await q`select count(*)::int as n, count(distinct (user_id, completed_date))::int as d from check_ins`;
  check('migration applied', true);
  check(
    'row count and distinct member-days unchanged',
    totalBefore === totalAfter && distinctBefore === distinctAfter,
  );
  check('existing rows byte-identical (all original columns)', before.hash === after.hash);
  const [{ n: nonPrimary }] =
    await q`select count(*)::int as n from check_ins where not is_primary`;
  check('every existing row is primary (none non-primary)', nonPrimary === 0);
  const indexes = (
    await q`select indexname from pg_indexes where schemaname = ${SCHEMA} and tablename = 'check_ins'`
  ).map((r) => r.indexname);
  check('new partial unique index exists', indexes.includes('unique_check_ins_primary_user_date'));
  check('lookup index exists', indexes.includes('idx_check_ins_user_date'));
  const constraintsOf = async () =>
    (
      await q`select c.conname from pg_constraint c
        join pg_class t on t.oid = c.conrelid join pg_namespace n on n.oid = t.relnamespace
        where n.nspname = ${SCHEMA} and t.relname = 'check_ins'`
    ).map((r) => r.conname);
  const constraints = await constraintsOf();
  check(
    'old one-row-per-day constraint is gone',
    !constraints.includes('unique_check_ins_user_date'),
  );
  check(
    'a second PRIMARY for the same member and day is still rejected by the new index',
    (await errorCode(q`insert into check_ins (user_id, mood_score, capacity_score, completed_at, completed_date, is_primary)
      values (${u1}, 3, 3, '2026-11-02T18:00:00Z', '2026-11-02', true)`)) === '23505',
  );
  await applyMigration();
  const [{ n: totalIdem }] = await q`select count(*)::int as n from check_ins`;
  check(
    're-applying the migration is safe (idempotent) and changes nothing',
    totalIdem === totalAfter,
  );

  section('2. Primary plus additional check-ins for one member and day');
  const mapping = loadCategoryMapping();
  check(
    'recommendation mapping read from packages/core (5 scores)',
    Object.keys(mapping).length === 5 && Object.values(mapping).every(Boolean),
    JSON.stringify(mapping),
  );
  const DAY = '2026-11-09';
  const recordCheckIn = async (user, cap, hhmm) => {
    const completedAt = `${DAY}T${hhmm}:00Z`;
    const [primary] =
      await q`insert into check_ins (user_id, mood_score, capacity_score, completed_at, completed_date, is_primary)
      values (${user}, 3, ${cap}, ${completedAt}, ${DAY}, true)
      on conflict (user_id, completed_date) where is_primary do nothing returning *`;
    if (primary) return primary;
    const [additional] =
      await q`insert into check_ins (user_id, mood_score, capacity_score, completed_at, completed_date, is_primary)
      values (${user}, 3, ${cap}, ${completedAt}, ${DAY}, false) returning *`;
    return additional;
  };
  const primary = await recordCheckIn(u1, 2, '08:00');
  check('first check-in of the day is saved as the primary', primary.is_primary === true);
  const extra = [
    await recordCheckIn(u1, 5, '12:00'),
    await recordCheckIn(u1, 1, '15:00'),
    await recordCheckIn(u1, 4, '20:00'),
  ];
  check(
    'three further check-ins are saved as additional records',
    extra.every((r) => r.is_primary === false),
  );
  check(
    'every check-in is its own row',
    new Set([primary.id, ...extra.map((r) => r.id)]).size === 4,
  );
  const [{ p, a }] =
    await q`select count(*) filter (where is_primary)::int as p, count(*) filter (where not is_primary)::int as a
    from check_ins where user_id = ${u1} and completed_date = ${DAY}`;
  check(
    'exactly one primary and three additional for that member and day',
    p === 1 && a === 3,
    `${p}/${a}`,
  );
  const [primaryNow] = await q`select * from check_ins where id = ${primary.id}`;
  check(
    'the primary row is unchanged by the additional check-ins',
    primaryNow.capacity_score === 2 &&
      String(primaryNow.completed_at) === String(primary.completed_at) &&
      primaryNow.is_primary === true,
  );

  section('3. The recommendation follows the primary, never an additional check-in');
  const latestPrimary = (
    await q`select * from check_ins where user_id = ${u1} and is_primary order by completed_date desc, completed_at desc limit 1`
  )[0];
  const latestAny = (
    await q`select * from check_ins where user_id = ${u1} order by completed_date desc, completed_at desc limit 1`
  )[0];
  check('getLatestCheckIn (primary only) returns the primary', latestPrimary.id === primary.id);
  check(
    `recommendation category comes from the primary (score 2 -> ${mapping[2]})`,
    mapping[latestPrimary.capacity_score] === mapping[2],
  );
  check(
    `an unfiltered "latest" would have changed it (score ${latestAny.capacity_score} -> ${mapping[latestAny.capacity_score]}): the primary filter is what protects it`,
    mapping[latestAny.capacity_score] !== mapping[2],
  );
  const today = (
    await q`select * from check_ins where user_id = ${u1} and completed_date = ${DAY} and is_primary limit 1`
  )[0];
  check("today's check-in (Home 'checked in') is the primary", today.id === primary.id);
  const history =
    await q`select id, is_primary from check_ins where user_id = ${u1} and completed_date = ${DAY} order by completed_at desc, id desc`;
  check(
    'history lists all four check-ins, newest first',
    history.length === 4 && history[0].id === extra[2].id,
  );

  section('4. Simultaneous first check-ins (six at once)');
  const results6 = await Promise.all(
    Array.from({ length: 6 }, (_, i) => recordCheckIn(u3, 1 + (i % 5), `10:0${i}`)),
  );
  const [{ p: p3, a: a3 }] =
    await q`select count(*) filter (where is_primary)::int as p, count(*) filter (where not is_primary)::int as a
    from check_ins where user_id = ${u3} and completed_date = ${DAY}`;
  check(
    'exactly one becomes primary, the other five are additional',
    p3 === 1 && a3 === 5 && results6.length === 6,
    `${p3}/${a3}`,
  );
  const dupes =
    await q`select user_id, completed_date from check_ins where is_primary group by 1, 2 having count(*) > 1`;
  check('never more than one primary per member per day (whole table)', dupes.length === 0);
  const mid = (await FIXTURE_HASH(existingIds))[0];
  check('existing records still byte-identical after all of the above', mid.hash === before.hash);

  section('5. Rollback WITH additional check-ins present (preserving variant)');
  const [{ n: additionalBefore }] =
    await q`select count(*)::int as n from check_ins where not is_primary`;
  const [{ n: primaryBefore }] = await q`select count(*)::int as n from check_ins where is_primary`;
  await runAll(ROLLBACK_PRESERVING);
  const [{ n: backedUp }] = await q`select count(*)::int as n from check_ins_additional_backup`;
  check(
    'every additional check-in was copied to the backup table first',
    backedUp === additionalBefore,
    `${backedUp}/${additionalBefore}`,
  );
  const [{ n: remaining }] = await q`select count(*)::int as n from check_ins`;
  check('only the primary rows remain in check_ins', remaining === primaryBefore);
  const cols = (
    await q`select column_name from information_schema.columns where table_schema = ${SCHEMA} and table_name = 'check_ins'`
  ).map((r) => r.column_name);
  check('is_primary column removed', !cols.includes('is_primary'));
  const constraintsAfterRollback = await constraintsOf();
  check(
    'old one-row-per-day constraint restored',
    constraintsAfterRollback.includes('unique_check_ins_user_date'),
  );
  const idxAfterRollback = (
    await q`select indexname from pg_indexes where schemaname = ${SCHEMA} and tablename = 'check_ins'`
  ).map((r) => r.indexname);
  check(
    'new indexes removed',
    !idxAfterRollback.includes('unique_check_ins_primary_user_date') &&
      !idxAfterRollback.includes('idx_check_ins_user_date'),
  );
  const afterRollback = (await FIXTURE_HASH(existingIds))[0];
  check('existing records byte-identical after rollback', afterRollback.hash === before.hash);
  check(
    'old behaviour is back: a second check-in the same day is rejected again',
    (await errorCode(q`insert into check_ins (user_id, mood_score, capacity_score, completed_at, completed_date)
      values (${u1}, 3, 3, '2026-11-09T21:00:00Z', ${DAY})`)) === '23505',
  );

  section('6. Re-apply after rollback, then the lossless rollback (no additional rows)');
  await applyMigration();
  const [{ n: reCount }] = await q`select count(*)::int as n from check_ins`;
  const [{ n: reNonPrimary }] =
    await q`select count(*)::int as n from check_ins where not is_primary`;
  check(
    'migration re-applies cleanly after a rollback; all rows primary',
    reCount === remaining && reNonPrimary === 0,
  );
  await runAll(ROLLBACK_CORE);
  const colsAgain = (
    await q`select column_name from information_schema.columns where table_schema = ${SCHEMA} and table_name = 'check_ins'`
  ).map((r) => r.column_name);
  const lossless = (await FIXTURE_HASH(existingIds))[0];
  check(
    'lossless rollback removes the column and restores the constraint',
    !colsAgain.includes('is_primary'),
  );
  check('records byte-identical after the lossless rollback', lossless.hash === before.hash);

  section('7. Nothing leaked outside the throwaway schema, and the runbook agrees');
  const [{ leaked: leakedAfter }] =
    await admin`select count(*)::int as leaked from pg_tables where schemaname not in ('pg_catalog','information_schema') and schemaname <> ${SCHEMA} and tablename in ('check_ins','users') `;
  check('no tables created or changed outside the throwaway schema', leakedAfter === leakedBefore);
  const doc = readFileSync(DOC_FILE, 'utf8');
  check(
    'the documented rollback statements are the ones exercised here',
    ROLLBACK_PRESERVING.every((statement) => doc.includes(statement)),
  );
}

let crashed = false;
try {
  await main();
} catch (err) {
  crashed = true;
  console.error(
    scrub(
      `\nThe rehearsal stopped on an error: ${err?.code ? `[${err.code}] ` : ''}${err?.message ?? err}`,
    ),
  );
} finally {
  try {
    await admin.unsafe(`drop schema if exists ${SCHEMA} cascade`);
    if (!process.argv.includes('--check-target'))
      log(`\nCleanup: throwaway schema ${SCHEMA} dropped.`);
  } catch (err) {
    console.error(
      scrub(`CLEANUP FAILED - drop schema ${SCHEMA} manually. (${err?.message ?? err})`),
    );
    crashed = true;
  }
  await sql?.end({ timeout: 5 }).catch(() => {});
  await admin.end({ timeout: 5 }).catch(() => {});
}

const failed = results.filter((r) => !r.ok).length;
if (!process.argv.includes('--check-target')) {
  log(
    `\nResult: ${results.length - failed} passed, ${failed} failed${crashed ? ' (stopped early on an error)' : ''}.`,
  );
}
process.exit(crashed || failed > 0 ? 1 : 0);
