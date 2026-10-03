ALTER TABLE "entitlements" ADD COLUMN "payment_failed_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "practices" ADD COLUMN "is_free" boolean DEFAULT false NOT NULL;