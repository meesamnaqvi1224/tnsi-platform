import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { getTableConfig } from 'drizzle-orm/pg-core';
// `@tnsi/db/schema` is the schema only - unlike `@tnsi/db` it does not open a
// database connection, so this test needs no DATABASE_URL.
import { entitlements, trialClaims } from '@tnsi/db/schema';

const DB_DIR = fileURLToPath(new URL('../../../../packages/db/drizzle/', import.meta.url));
const MIGRATION = readFileSync(
  `${DB_DIR}0012_add_membership_trial_grace_and_free_content.sql`,
  'utf8',
);
const JOURNAL = JSON.parse(readFileSync(`${DB_DIR}meta/_journal.json`, 'utf8')) as {
  entries: { idx: number; tag: string; when: number }[];
};

function column(table: Parameters<typeof getTableConfig>[0], name: string) {
  const col = getTableConfig(table).columns.find((c) => c.name === name);
  if (!col) throw new Error(`missing column ${name}`);
  return col;
}

describe('membership trial schema (entitlements + trial_claims)', () => {
  it('adds nullable trial and Stripe-sync timestamps to entitlements', () => {
    for (const name of ['trial_started_at', 'trial_ends_at', 'stripe_synced_at']) {
      const col = column(entitlements, name);
      expect(col.notNull).toBe(false);
      expect(col.hasDefault).toBe(false);
      expect(col.dataType).toBe('date');
    }
  });

  it('leaves the tier and status enums untouched, so legacy Lifetime stays valid', () => {
    const tier = column(entitlements, 'tier') as unknown as { enumValues: string[] };
    expect(tier.enumValues).toEqual(['free', 'monthly', 'annual', 'lifetime']);
  });

  it('keys trial claims by email_key and has no foreign key, so claims outlive accounts', () => {
    const config = getTableConfig(trialClaims);
    expect(config.columns.filter((c) => c.primary).map((c) => c.name)).toEqual(['email_key']);
    expect(config.foreignKeys).toHaveLength(0);
    expect(column(trialClaims, 'user_id').notNull).toBe(false);
    expect(column(trialClaims, 'trial_ends_at').notNull).toBe(true);
    expect(column(trialClaims, 'key_version').notNull).toBe(true);
  });

  it('stores no raw email column anywhere on the claims table', () => {
    const names = getTableConfig(trialClaims).columns.map((c) => c.name);
    expect(names).toEqual(['email_key', 'key_version', 'user_id', 'claimed_at', 'trial_ends_at']);
    expect(names.some((n) => n === 'email' || n.endsWith('_email'))).toBe(false);
  });

  it('declares the check constraints in the schema', () => {
    expect(getTableConfig(entitlements).checks.map((c) => c.name)).toContain(
      'entitlements_trial_window',
    );
    expect(getTableConfig(trialClaims).checks.map((c) => c.name)).toContain(
      'trial_claims_email_key_format',
    );
  });
});

describe('migration 0012 (membership trial, payment grace and free content)', () => {
  const statements = MIGRATION.split('--> statement-breakpoint')
    .map((s) => s.trim())
    .filter(Boolean);

  it('is registered in the journal after the migrations already on main (0010 and 0010a)', () => {
    const last = JOURNAL.entries.at(-1);
    expect(last).toMatchObject({
      idx: 12,
      tag: '0012_add_membership_trial_grace_and_free_content',
    });
    expect(JOURNAL.entries.at(-2)?.tag).toBe('0010a_add_crm_outbox');
  });

  it('is dated after every earlier migration (drizzle skips a migration older than the last one applied)', () => {
    const when = JOURNAL.entries.map((e) => e.when);
    expect(when.at(-1)!).toBeGreaterThan(Math.max(...when.slice(0, -1)));
  });

  it('is purely additive: no drops, deletes, updates, renames or column rewrites', () => {
    expect(MIGRATION).not.toMatch(
      /\b(DROP|DELETE|UPDATE|TRUNCATE|RENAME|ALTER TYPE|ALTER COLUMN|SET NOT NULL)\b/i,
    );
    for (const s of statements) {
      expect(s).toMatch(/^(CREATE TABLE|CREATE INDEX|ALTER TABLE [\s\S]* ADD (COLUMN|CONSTRAINT))/);
    }
  });

  it('does not touch tiers, enums or any Lifetime data', () => {
    expect(MIGRATION).not.toMatch(/lifetime|"tier"|"status"|enum/i);
  });

  it('adds exactly the three entitlement columns and the claims table', () => {
    expect(MIGRATION).toContain('CREATE TABLE IF NOT EXISTS "trial_claims"');
    for (const name of ['trial_started_at', 'trial_ends_at', 'stripe_synced_at']) {
      expect(MIGRATION).toContain(
        `ALTER TABLE "entitlements" ADD COLUMN "${name}" timestamp with time zone;`,
      );
    }
  });

  it('carries the same check constraints the schema declares', () => {
    expect(MIGRATION).toContain('CONSTRAINT "entitlements_trial_window" CHECK');
    expect(MIGRATION).toContain('CONSTRAINT "trial_claims_email_key_format" CHECK');
  });
});
