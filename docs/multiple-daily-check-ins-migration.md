# Multiple daily check-ins: migration plan

Status: **prepared, not applied anywhere.** Nothing in this document has been run against any
database. Migration `0013_multiple_daily_check_ins` must not be applied to production without
explicit approval.

## 1. Schema changes

`check_ins` (see `packages/db/drizzle/0013_multiple_daily_check_ins.sql`):

| Change                                                                                                        | Detail                                                                      |
| ------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| Add `is_primary boolean NOT NULL DEFAULT true`                                                                | Marks the check-in that drives the day's recommendation.                    |
| Add partial unique index `unique_check_ins_primary_user_date` on `(user_id, completed_date) WHERE is_primary` | At most one primary per member per day.                                     |
| Drop constraint `unique_check_ins_user_date`                                                                  | The old one-row-per-day rule; this is what lets additional check-ins exist. |
| Add index `idx_check_ins_user_date` on `(user_id, completed_date)`                                            | Plain lookup by member and day.                                             |

No other table changes. `practice_completions`, reflections, CRM outbox and entitlements are untouched.

## 2. How existing records are preserved

Nothing is rewritten or deleted. `is_primary` is added with `DEFAULT true`, so every existing row is
marked primary. That is correct by construction: the old `unique(user_id, completed_date)` allowed
exactly one row per member per day, so each existing row already was that day's only check-in.
Row count, ids, scores, notes and timestamps are unchanged. Verification SQL is in section 6.

## 3. How the primary check-in is identified

The first check-in a member saves on a given (server-local) calendar day is the primary. It is
decided at write time and stored in `is_primary`, not inferred later. Only the primary:

- drives the daily recommendation (`getLatestCheckIn` reads primary rows only),
- counts as "checked in today" on Home and the dashboard (`getTodayCheckIn`, `/api/v1/today`).

The primary is claimed atomically: the insert uses `ON CONFLICT (user_id, completed_date) WHERE
is_primary DO NOTHING`, so two simultaneous first check-ins cannot both become primary.

## 4. How additional check-ins are handled

If the primary already exists for that day, the new check-in is inserted as its own row with
`is_primary = false`. It is never merged, never overwrites anything, and never changes the primary
or the recommendation. It appears in check-in history, My Progress (labelled "Additional check-in")
and My Journey like any other record. `POST /api/v1/check-ins` no longer answers 400 for a second
check-in the same day; it returns 201 with `isPrimary` in the body.

Time zone metadata (Phase 1, already on `main`): `recordCheckIn` takes the optional metadata and stores
it identically on the primary and on any additional record, so an additional check-in never loses the
member's recorded time zone. A missing or invalid zone stores `{}` and the check-in is still saved.
API responses never contain it (`metadata` is always returned as `{}`).

What is deliberately not part of this change: the "check in again" control in the apps. That is UI
and follows once this is approved and applied.

Known, unchanged behaviour: "the day" is the server's local calendar day (`completedDate`), as
before. A member in another timezone can see the day roll over at the server's midnight.

## 5. Migration and rollback strategy

**Ordering (important).** The migration is expand-only and backwards compatible, so the safe order is:

1. Rehearse on an isolated Neon branch (`TNSI_TEST_DATABASE_URL=<branch> pnpm --filter @tnsi/db db:migrate`;
   `drizzle.config.ts` refuses the production host unless explicitly acknowledged).
2. After approval, apply to production.
3. Only then deploy the application code. Code from before this change keeps working on the migrated
   database (it inserts without `is_primary`, which defaults to true, and its duplicate check still
   runs before its insert). The new code does **not** work on an un-migrated database (the column is
   missing), so the code must never go out first.

The four statements run in the order: add column, create the new unique index, drop the old
constraint, create the lookup index. The new guarantee exists before the old one is removed, so there
is no window without uniqueness. All statements are `IF [NOT] EXISTS`-guarded.

**Rollback.** Before any additional check-in has been saved, rollback is lossless:

```sql
BEGIN;
ALTER TABLE check_ins ADD CONSTRAINT unique_check_ins_user_date UNIQUE (user_id, completed_date);
DROP INDEX IF EXISTS unique_check_ins_primary_user_date;
DROP INDEX IF EXISTS idx_check_ins_user_date;
ALTER TABLE check_ins DROP COLUMN is_primary;
COMMIT;
```

After additional check-ins exist, the old constraint cannot be restored while they remain. Keep them
first, then remove them from `check_ins`:

```sql
BEGIN;
CREATE TABLE check_ins_additional_backup AS SELECT * FROM check_ins WHERE NOT is_primary;
DELETE FROM check_ins WHERE NOT is_primary;
-- then the same four statements as above
COMMIT;
```

Rolling back the database also requires rolling back the application code first (the new code reads
`is_primary`). Also remove the `0013` row from `drizzle.__drizzle_migrations` and the journal entry
if the migration is to be re-run later.

## 5a. Rehearsal script

`packages/db/scripts/rehearse-check-ins-migration.mjs` rehearses everything above on an isolated
database. It reads only `TNSI_TEST_DATABASE_URL` from your shell (never a `.env` file), prints no
credentials, and refuses to run unless the target is positively identified as isolated: not the
production endpoint, not the same endpoint as `DATABASE_URL`/`DATABASE_URL_UNPOOLED` if those are set,
and either localhost or a Neon host whose endpoint id you also declare in
`TNSI_TEST_DATABASE_ENDPOINT`. It works only inside a throwaway schema it creates and drops, so it
never touches an existing table.

```bash
TNSI_TEST_DATABASE_URL='<isolated database url>' \
TNSI_TEST_DATABASE_ENDPOINT='<ep-... id of that database>' \
  node packages/db/scripts/rehearse-check-ins-migration.mjs --check-target   # identify only
# then, without --check-target, for the full rehearsal
```

It covers: existing rows, the real `0013` file, the verification SQL, an idempotent re-apply, one
primary plus several additional check-ins (and a six-at-once burst), the recommendation staying on the
primary, existing rows byte-identical, rollback with additional rows present, re-apply, and the
lossless rollback. Exit code 0 only if every check passes. It has been run against a local PostgreSQL 18
engine (37/37); it has not yet been run on a Neon branch.

## 5b. Real-database integration test (run on Neon before approval)

`apps/web/src/lib/check-ins.integration.test.ts` runs the app's own check-in code (`recordCheckIn`,
`getTodayCheckIn`, `getLatestCheckIn`, `getCheckInHistory`, `getRecommendedPractice`) against a real
database: primary vs additional flags, identical metadata on both, today/latest/recommendation following
the primary, history order and paging, and **six simultaneous first check-ins giving exactly one
primary**. It is skipped unless `TNSI_TEST_DATABASE_URL` is set and refuses the production host. Run it on
the isolated Neon database, after migration 0013 is applied there, with the server day pinned to UTC:

```bash
cd apps/web
TZ=UTC TNSI_TEST_DATABASE_URL='<isolated database url>' \
  node_modules/.bin/vitest run src/lib/check-ins.integration.test.ts
```

The concurrency test must run on Neon. A single-session local engine cannot interleave simultaneous
queries and may opt out with `TNSI_TEST_SKIP_CONCURRENCY=yes`; that opt-out is ignored for any `.neon.tech`
target, so a Neon run always executes it. The test creates its own member and practices and deletes them.

## 6. Verification SQL (run on the rehearsal branch, then on production after approval)

```sql
-- before and after: identical
SELECT count(*), count(DISTINCT (user_id, completed_date)) FROM check_ins;
-- after: every pre-existing row is primary
SELECT count(*) FROM check_ins WHERE NOT is_primary;               -- expect 0
-- after: the new index exists and the old constraint is gone
SELECT indexname FROM pg_indexes WHERE tablename = 'check_ins';
SELECT conname FROM pg_constraint WHERE conrelid = 'check_ins'::regclass;
-- after new code: never more than one primary per member per day
SELECT user_id, completed_date, count(*) FROM check_ins
 WHERE is_primary GROUP BY 1, 2 HAVING count(*) > 1;               -- expect no rows
```

## 7. Migration numbering

`0013` follows `0012` on `main`. A different, unmerged branch (membership trial policy) carries its
own 0010/0011 migrations; whoever merges second must renumber and keep `when` values increasing,
because drizzle skips entries older than the latest applied one.
