# TNSI Somatic Card Migration Incident

**Type:** Incident report. All verification in this document was performed read-only against production. No production data, schema, or credentials were modified to produce it.

---

## 1. Incident Summary

During the Somatic Card database schema implementation milestone, migration `0009_add_somatic_series_and_cards.sql` was run with the intent of validating it against an isolated Neon test branch. Instead, due to an environment-variable precedence issue (§2), the migration was silently applied to the **real production database** instead. This was not noticed at the time — the implementation turn's own validation checked the isolated branch, found the migration absent there (correctly, since it never ran there), and concluded the `drizzle-kit migrate` CLI had failed to apply it, without realizing it had in fact succeeded elsewhere. The mistake was discovered during the subsequent read-only implementation audit, when a direct, read-only check against production's real connection string turned up the new tables already present.

## 2. Root Cause

Three things combined to cause this:

1. **`packages/db/.env`** (gitignored, pre-existing in the repository before any of this session's work, not created by any milestone in this project) sets:
   - `DATABASE_URL_UNPOOLED=postgresql://neondb_owner:<redacted>@ep-damp-flower-ayp7i2gc.c-5.us-east-2.aws.neon.tech/neondb?...` — production's direct-connection host.
   - `DATABASE_URL=postgresql://neondb_owner:<redacted>@ep-damp-flower-ayp7i2gc-pooler.c-5.us-east-2.aws.neon.tech/neondb?...` — production's pooled-connection host.
     Its own header comment states: _"Read automatically by drizzle-kit (db:generate/db:migrate/db:push/db:studio)."_

2. **`packages/db/drizzle.config.ts`** resolves its connection target as:

   ```ts
   url: process.env.DATABASE_URL_UNPOOLED ||
     process.env.DATABASE_URL ||
     'postgresql://postgres:postgres@localhost:5432/tnsi_dev';
   ```

   `DATABASE_URL_UNPOOLED` is checked **first**.

3. **Variable precedence.** The migration-validation commands run during the implementation milestone set `DATABASE_URL=<isolated test branch>` as an inline shell variable, but never set `DATABASE_URL_UNPOOLED`. `drizzle-kit` auto-loads `packages/db/.env` via dotenv before evaluating the config. Dotenv's default behavior does not override a variable already present in `process.env` — but `DATABASE_URL_UNPOOLED` was never set by the shell invocation, so dotenv filled that empty slot from the file, and `drizzle.config.ts`'s `||` chain then picked that value (production) over the `DATABASE_URL` override that was actually intended to win.

Net effect: any `drizzle-kit migrate` invocation that sets `DATABASE_URL` alone, without also explicitly setting `DATABASE_URL_UNPOOLED`, silently targets production — regardless of intent.

## 3. Production Impact

Verified directly, read-only, against production's real connection string (from `apps/web/.env.local`'s `DATABASE_URL`) as part of this milestone:

- **Tables created:** `somatic_series`, `somatic_cards` — both confirmed present.
- **Rows created:** zero in both tables, confirmed by direct `count(*)` query.
- **Enum created:** `somatic_publication_status` (`draft`/`published`/`archived`) — additive, no existing enum touched.
- **Existing tables affected:** none. Verified by comparing production's current per-table column count against the exact column counts `drizzle-kit generate` computed as expected when migration 0009 was generated (`practices`: 15, `power_drop_usages`: 7, `practice_completions`: 12, `practice_reflections`: 8, `practice_saves`: 4, `entitlements`: 15, `users`: 9, `check_ins`: 9, `assessment_submissions`: 8) — every value matches exactly, confirming no column was added, removed, or altered on any pre-existing table.
- **Content changed:** none. `users` (13 rows), `practices` (5 rows), `entitlements` (13 rows), `power_drop_usages` (0 rows) were queried directly as a sanity check — these are live production row counts, unrelated to this migration, included here only to confirm the tables are intact and queryable, not as a before/after comparison (no "before" snapshot exists, since this incident was discovered after the fact).
- **Migration record:** production's `drizzle.__drizzle_migrations` table has a row (`id: 10`) with hash `d943da424ed3f26a138ed21494777b0154b8ea8b2d32c00f18d26d12aab1e4bb`, timestamp `1790053803669`. This hash was independently recomputed from the migration file currently in the repository (`shasum -a 256 packages/db/drizzle/0009_add_somatic_series_and_cards.sql`) and **matches exactly** — production's applied migration is byte-for-byte identical to what's in the repository. No drift, no partial application, no manual edit.

## 4. Technical Assessment

**The migration itself is safe.** It is purely additive: one new enum, two new tables, one new foreign key (on the new tables only, `somatic_cards.series_id → somatic_series.id`), four new indexes. It contains no `ALTER`, `DROP`, or `UPDATE` statement against any existing table — confirmed by direct read of the migration SQL. No Practice or PowerDrop table, row, or behavior is affected in any way.

**What makes this an incident anyway:** safety of the DDL is not the same as the change being authorized. This migration reached production without anyone making an explicit "yes, deploy this to production" decision — it happened as an unintended side effect of an attempt to test in isolation. That the outcome was harmless this time doesn't make the process gap acceptable; the same failure mode could just as easily have applied a destructive migration (e.g., a future column drop or type change) to production under the same false impression of "just testing." Part 2 of this milestone (see `docs/TNSI_Somatic_Card_Pre_Sync_Readiness.md`) addresses closing that gap.

## 5. Current State

- Production contains `somatic_series` and `somatic_cards`, both empty, both structurally correct and matching the repository's schema exactly.
- No Somatic Card content of any kind exists in production, in Sanity, or anywhere else in this repository.
- No PowerDrop or Practice data, schema, or behavior was altered.
- The tables are otherwise inert: nothing in the application (web or mobile) queries them yet, since no API route, sync layer, or UI has been built against them. Their presence has no observable effect on the running product.
- **Per this milestone's explicit instruction, these tables have been left exactly as they are.** No rollback, drop, or truncation was performed or is proposed here.

## 6. Corrective Action

The database-targeting safety mechanism implemented in this same milestone (see `docs/TNSI_Somatic_Card_Pre_Sync_Readiness.md` §3 for full detail) directly closes the mechanism that caused this incident: an explicitly supplied test database target can no longer be silently overridden by `packages/db/.env`'s production value, and a production-identifying safety check now blocks accidental production targeting unless explicitly acknowledged.

## 7. Follow-Up

Only genuine remaining operational work — no destructive action is proposed:

- Whoever owns production infrastructure decisions should be made aware that `somatic_series`/`somatic_cards` exist in production ahead of the sync milestone that will actually start writing to them — this document, plus the pre-sync readiness report, is that notice.
- No cleanup action is required or recommended: the tables are empty, harmless, and will be the correct target for the real sync layer once it's built — there is nothing to undo.
- The database-targeting fix (§6) should be adopted as the team's standard way of running migrations against anything other than production going forward.
