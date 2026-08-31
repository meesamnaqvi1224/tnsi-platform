DROP INDEX IF EXISTS "idx_entitlements_stripe_customer";--> statement-breakpoint
DROP INDEX IF EXISTS "idx_entitlements_stripe_subscription";--> statement-breakpoint
ALTER TABLE "entitlements" ADD CONSTRAINT "unique_entitlements_stripe_customer" UNIQUE("stripe_customer_id");--> statement-breakpoint
ALTER TABLE "entitlements" ADD CONSTRAINT "unique_entitlements_stripe_subscription" UNIQUE("stripe_subscription_id");