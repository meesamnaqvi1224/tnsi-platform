-- Multiple check-ins per day. Expand-only and backwards compatible: code from before this change keeps
-- working against the migrated database (see docs/multiple-daily-check-ins-migration.md).
--
-- 1. is_primary marks the one check-in per member per day that drives the daily recommendation.
--    DEFAULT true backfills every existing row as primary, which is what each one was: the old
--    unique(user_id, completed_date) allowed exactly one row per member per day.
ALTER TABLE "check_ins" ADD COLUMN IF NOT EXISTS "is_primary" boolean DEFAULT true NOT NULL;--> statement-breakpoint
-- 2. The new guarantee goes in BEFORE the old one comes out, so there is never a moment without one:
--    at most one primary per member per day.
CREATE UNIQUE INDEX IF NOT EXISTS "unique_check_ins_primary_user_date" ON "check_ins" USING btree ("user_id","completed_date") WHERE "check_ins"."is_primary";--> statement-breakpoint
-- 3. Now the old one-row-per-day constraint can go, which is what allows additional check-ins.
ALTER TABLE "check_ins" DROP CONSTRAINT IF EXISTS "unique_check_ins_user_date";--> statement-breakpoint
-- 4. Plain lookup index for "this member's check-ins on this day".
CREATE INDEX IF NOT EXISTS "idx_check_ins_user_date" ON "check_ins" USING btree ("user_id","completed_date");
