DO $$ BEGIN
 CREATE TYPE "public"."somatic_publication_status" AS ENUM('draft', 'published', 'archived');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "somatic_series" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"sanity_id" text NOT NULL,
	"series_number" integer NOT NULL,
	"title" text NOT NULL,
	"slug" text NOT NULL,
	"collection" text NOT NULL,
	"description" text,
	"core_question" text,
	"visual_treatment" text,
	"default_layout" text,
	"status" "somatic_publication_status" DEFAULT 'draft' NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"sanity_data" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "unique_somatic_series_sanity_id" UNIQUE("sanity_id"),
	CONSTRAINT "unique_somatic_series_slug" UNIQUE("slug"),
	CONSTRAINT "unique_somatic_series_collection_series_number" UNIQUE("collection","series_number")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "somatic_cards" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"sanity_id" text NOT NULL,
	"card_number" integer NOT NULL,
	"title" text NOT NULL,
	"slug" text NOT NULL,
	"series_id" uuid NOT NULL,
	"collection" text NOT NULL,
	"status" "somatic_publication_status" DEFAULT 'draft' NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"invitation" text,
	"purpose" text,
	"description" text,
	"orientation" text,
	"gentle_note" text,
	"anchor" text,
	"visual_treatment" text,
	"card_artwork_url" text,
	"card_artwork_alt" text,
	"hero_image_url" text,
	"hero_image_alt" text,
	"practice_steps" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"what_to_notice" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"supporting_images" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"demonstration_sequence" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"sanity_data" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "unique_somatic_cards_sanity_id" UNIQUE("sanity_id"),
	CONSTRAINT "unique_somatic_cards_slug" UNIQUE("slug"),
	CONSTRAINT "unique_somatic_cards_collection_card_number" UNIQUE("collection","card_number")
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "somatic_cards" ADD CONSTRAINT "somatic_cards_series_id_somatic_series_id_fk" FOREIGN KEY ("series_id") REFERENCES "public"."somatic_series"("id") ON DELETE restrict ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_somatic_series_collection_status" ON "somatic_series" USING btree ("collection","status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_somatic_series_collection_sort" ON "somatic_series" USING btree ("collection","sort_order");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_somatic_cards_series_status" ON "somatic_cards" USING btree ("series_id","status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_somatic_cards_series_sort" ON "somatic_cards" USING btree ("series_id","sort_order");