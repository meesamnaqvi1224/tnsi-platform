DO $$ BEGIN
 CREATE TYPE "public"."entitlement_status" AS ENUM('active', 'past_due', 'canceled', 'trialing', 'expired');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."entitlement_tier" AS ENUM('free', 'monthly', 'annual', 'lifetime');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."practice_content_type" AS ENUM('audio', 'video', 'meditation', 'breathwork', 'movement', 'journal');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "check_ins" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"mood_score" integer NOT NULL,
	"capacity_score" integer NOT NULL,
	"notes" text,
	"completed_at" timestamp with time zone NOT NULL,
	"completed_date" date NOT NULL,
	"metadata" jsonb DEFAULT '{}' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "unique_check_ins_user_date" UNIQUE("user_id","completed_date"),
	CONSTRAINT "check_ins_mood_score_range" CHECK (mood_score BETWEEN 1 AND 5),
	CONSTRAINT "check_ins_capacity_score_range" CHECK (capacity_score BETWEEN 1 AND 5)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "entitlements" (
	"user_id" uuid NOT NULL,
	"tier" "entitlement_tier" DEFAULT 'free' NOT NULL,
	"status" "entitlement_status" DEFAULT 'active' NOT NULL,
	"programs" text[] DEFAULT '{}' NOT NULL,
	"certifications" text[] DEFAULT '{}' NOT NULL,
	"features" text[] DEFAULT '{}' NOT NULL,
	"stripe_customer_id" text,
	"stripe_subscription_id" text,
	"current_period_start" timestamp with time zone,
	"current_period_end" timestamp with time zone,
	"cancel_at_period_end" boolean DEFAULT false NOT NULL,
	"canceled_at" timestamp with time zone,
	"metadata" jsonb DEFAULT '{}' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "entitlements_user_id_pk" PRIMARY KEY("user_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"clerk_user_id" text NOT NULL,
	"email" text NOT NULL,
	"full_name" text,
	"avatar_url" text,
	"metadata" jsonb DEFAULT '{}' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "unique_users_clerk_user_id" UNIQUE("clerk_user_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "practices" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"sanity_id" text NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"content_type" "practice_content_type" NOT NULL,
	"media_url" text,
	"thumbnail_url" text,
	"duration_seconds" integer,
	"category" text,
	"tags" text[] DEFAULT '{}' NOT NULL,
	"difficulty" integer DEFAULT 1 NOT NULL,
	"sanity_data" jsonb NOT NULL,
	"is_published" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "unique_practices_sanity_id" UNIQUE("sanity_id"),
	CONSTRAINT "practices_difficulty_range" CHECK (difficulty BETWEEN 1 AND 3)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "practice_completions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"practice_id" uuid NOT NULL,
	"progress_pct" real DEFAULT 0 NOT NULL,
	"position_seconds" integer DEFAULT 0 NOT NULL,
	"completed" boolean DEFAULT false NOT NULL,
	"completed_at" timestamp with time zone,
	"last_played_at" timestamp with time zone DEFAULT now() NOT NULL,
	"play_count" integer DEFAULT 0 NOT NULL,
	"metadata" jsonb DEFAULT '{}' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "unique_practice_completions_user_practice" UNIQUE("user_id","practice_id"),
	CONSTRAINT "practice_completions_progress_pct_range" CHECK (progress_pct BETWEEN 0 AND 1)
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "check_ins" ADD CONSTRAINT "check_ins_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "entitlements" ADD CONSTRAINT "entitlements_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "practice_completions" ADD CONSTRAINT "practice_completions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "practice_completions" ADD CONSTRAINT "practice_completions_practice_id_practices_id_fk" FOREIGN KEY ("practice_id") REFERENCES "public"."practices"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_check_ins_user_created" ON "check_ins" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_entitlements_stripe_customer" ON "entitlements" USING btree ("stripe_customer_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_entitlements_stripe_subscription" ON "entitlements" USING btree ("stripe_subscription_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_users_email" ON "users" USING btree ("email");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_practices_category" ON "practices" USING btree ("category");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_practices_content_type" ON "practices" USING btree ("content_type");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_practices_published" ON "practices" USING btree ("is_published");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_practice_completions_user_completed" ON "practice_completions" USING btree ("user_id","completed");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_practice_completions_user_last_played" ON "practice_completions" USING btree ("user_id","last_played_at");