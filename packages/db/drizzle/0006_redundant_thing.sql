DO $$ BEGIN
 CREATE TYPE "public"."post_practice_response" AS ENUM('DIFFERENT', 'SAME', 'NOT_SURE');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "practice_reflections" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"practice_id" uuid NOT NULL,
	"response" "post_practice_response",
	"reflection" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "unique_practice_reflections_user_practice" UNIQUE("user_id","practice_id")
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "practice_reflections" ADD CONSTRAINT "practice_reflections_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "practice_reflections" ADD CONSTRAINT "practice_reflections_practice_id_practices_id_fk" FOREIGN KEY ("practice_id") REFERENCES "public"."practices"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
