ALTER TYPE "practice_content_type" ADD VALUE 'interactive';--> statement-breakpoint
ALTER TABLE "practices" ADD COLUMN "interactive_key" text;