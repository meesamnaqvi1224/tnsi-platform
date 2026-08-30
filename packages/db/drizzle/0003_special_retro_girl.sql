CREATE TABLE IF NOT EXISTS "assessment_submissions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"assessment_slug" text NOT NULL,
	"email" text NOT NULL,
	"answers" jsonb NOT NULL,
	"score" real,
	"result_tier" text,
	"user_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "assessment_submissions" ADD CONSTRAINT "assessment_submissions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_assessment_submissions_email" ON "assessment_submissions" USING btree ("email");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_assessment_submissions_assessment_slug" ON "assessment_submissions" USING btree ("assessment_slug");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_assessment_submissions_user" ON "assessment_submissions" USING btree ("user_id");