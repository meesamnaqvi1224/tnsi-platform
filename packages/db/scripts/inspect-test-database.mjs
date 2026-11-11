#!/usr/bin/env node
/**
 * READ-ONLY look at what an isolated test database contains: its endpoint, whether drizzle's migration
 * ledger matches, which tables exist, and ROW COUNTS ONLY (never row contents). Same target rules as
 * the other scripts: TNSI_TEST_DATABASE_URL only, no credential printed, refuses production.
 */
import postgres from 'postgres';

const PROD = 'ep-damp-flower-ayp7i2gc';
const raw = process.env.TNSI_TEST_DATABASE_URL;
if (!raw) {
  console.error('REFUSING TO RUN: TNSI_TEST_DATABASE_URL is not set.');
  process.exit(2);
}
let url;
try {
  url = new URL(raw);
} catch {
  console.error('REFUSING TO RUN: TNSI_TEST_DATABASE_URL is not a valid database URL.');
  process.exit(2);
}
if (url.hostname.includes(PROD)) {
  console.error('REFUSING TO RUN: the target is the production database.');
  process.exit(2);
}
const endpoint = url.hostname.split('.')[0].replace(/-pooler$/, '');
console.log(`Endpoint: ${endpoint}`);

const sql = postgres(raw, { max: 1, onnotice: () => {}, connect_timeout: 20 });
const ro = (text) => sql.begin('read only', (tx) => tx.unsafe(text));
const safe = async (text) => {
  try {
    return await ro(text);
  } catch (e) {
    return { error: e.code ?? 'ERR' };
  }
};
try {
  const ledger = await safe(
    'select count(*)::int as n, max(created_at) as latest from drizzle.__drizzle_migrations',
  );
  console.log(
    'Migration ledger (drizzle.__drizzle_migrations):',
    JSON.stringify(ledger.error ? ledger : ledger[0]),
  );
  const tables = await safe(
    "select tablename from pg_tables where schemaname = 'public' order by 1",
  );
  console.log(
    'Tables in public:',
    tables.error ? JSON.stringify(tables) : tables.map((t) => t.tablename).join(', ') || '(none)',
  );
  console.log('Row counts (counts only):');
  for (const t of tables.error ? [] : tables) {
    if (!/^[a-z_]+$/.test(t.tablename)) continue;
    const c = await safe(`select count(*)::int as n from public.${t.tablename}`);
    console.log(`  ${t.tablename}: ${c.error ? JSON.stringify(c) : c[0].n}`);
  }
  const col = await safe(
    "select count(*)::int as n from information_schema.columns where table_schema='public' and table_name='check_ins' and column_name='is_primary'",
  );
  console.log('check_ins.is_primary present:', col.error ? JSON.stringify(col) : col[0].n === 1);
} finally {
  await sql.end({ timeout: 5 }).catch(() => {});
}
