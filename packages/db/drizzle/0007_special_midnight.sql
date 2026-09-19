-- Hand-added: drizzle-kit's schema diff can only emit structural DDL - it
-- has no way to know that `completion_id` should be backfilled from
-- existing data, so this UPDATE was written by hand and inserted here,
-- deliberately BEFORE either table's old unique(user_id, practice_id) is
-- dropped below. While that constraint still holds, there is at most one
-- practice_completions row per (user_id, practice_id), so this join is
-- provably unambiguous - every existing reflection links to the one
-- completion it was actually about, not a guess. Any reflection with no
-- matching completion row (never enforced server-side before this
-- migration - see practice-reflections.ts's own comment) simply keeps
-- completion_id NULL, which the schema now models as a real, valid state
-- rather than blocking the migration or inventing a fake completion for it.
ALTER TABLE "practice_reflections" ADD COLUMN "completion_id" uuid;--> statement-breakpoint
UPDATE "practice_reflections" pr
SET "completion_id" = pc.id
FROM "practice_completions" pc
WHERE pr.user_id = pc.user_id
  AND pr.practice_id = pc.practice_id
  AND pr.completion_id IS NULL;--> statement-breakpoint
ALTER TABLE "practice_completions" DROP CONSTRAINT "unique_practice_completions_user_practice";--> statement-breakpoint
ALTER TABLE "practice_reflections" DROP CONSTRAINT "unique_practice_reflections_user_practice";--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "practice_reflections" ADD CONSTRAINT "practice_reflections_completion_id_practice_completions_id_fk" FOREIGN KEY ("completion_id") REFERENCES "public"."practice_completions"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_practice_completions_user_practice_last_played" ON "practice_completions" USING btree ("user_id","practice_id","last_played_at");--> statement-breakpoint
ALTER TABLE "practice_reflections" ADD CONSTRAINT "unique_practice_reflections_completion" UNIQUE("completion_id");