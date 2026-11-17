CREATE TABLE IF NOT EXISTS "trial_claims" (
	"email_key" text PRIMARY KEY NOT NULL,
	"key_version" smallint DEFAULT 1 NOT NULL,
	"user_id" uuid,
	"claimed_at" timestamp with time zone DEFAULT now() NOT NULL,
	"trial_ends_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
ALTER TABLE "entitlements" ADD COLUMN "payment_failed_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "entitlements" ADD COLUMN "trial_started_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "entitlements" ADD COLUMN "trial_ends_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "entitlements" ADD COLUMN "stripe_synced_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "practices" ADD COLUMN "is_free" boolean DEFAULT false NOT NULL;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_trial_claims_user" ON "trial_claims" USING btree ("user_id");--> statement-breakpoint
ALTER TABLE "entitlements" ADD CONSTRAINT "entitlements_trial_window" CHECK ((trial_started_at IS NULL AND trial_ends_at IS NULL) OR (trial_started_at IS NOT NULL AND trial_ends_at IS NOT NULL AND trial_ends_at > trial_started_at));--> statement-breakpoint
ALTER TABLE "trial_claims" ADD CONSTRAINT "trial_claims_email_key_format" CHECK (email_key ~ '^[0-9a-f]{64}$');
