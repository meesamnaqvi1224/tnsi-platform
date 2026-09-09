CREATE TABLE IF NOT EXISTS "power_drop_usages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"power_drop_id" text NOT NULL,
	"power_drop_slug" text NOT NULL,
	"used_at" timestamp with time zone DEFAULT now() NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "power_drop_usages" ADD CONSTRAINT "power_drop_usages_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_power_drop_usages_user_power_drop" ON "power_drop_usages" USING btree ("user_id","power_drop_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_power_drop_usages_user_used_at" ON "power_drop_usages" USING btree ("user_id","used_at");