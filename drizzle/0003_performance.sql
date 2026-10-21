CREATE TABLE "request_limits" (
	"key" text PRIMARY KEY NOT NULL,
	"window_start" timestamp with time zone NOT NULL,
	"hits" integer NOT NULL
);
--> statement-breakpoint
DROP INDEX "bookings_status_idx";--> statement-breakpoint
DROP INDEX "bookings_customer_idx";--> statement-breakpoint
DROP INDEX "bookings_created_idx";--> statement-breakpoint
CREATE INDEX "booking_events_at_idx" ON "booking_events" USING btree ("at");--> statement-breakpoint
CREATE INDEX "bookings_created_id_idx" ON "bookings" USING btree ("created_at","id");--> statement-breakpoint
CREATE INDEX "bookings_status_created_idx" ON "bookings" USING btree ("status","created_at","id");--> statement-breakpoint
CREATE INDEX "bookings_customer_pickup_idx" ON "bookings" USING btree ("customer_id","pickup_date");--> statement-breakpoint
CREATE INDEX "bookings_phone_created_idx" ON "bookings" USING btree ("customer_phone","created_at");--> statement-breakpoint
CREATE INDEX "customers_recent_idx" ON "customers" USING btree (coalesce("last_booking_at", "created_at"),"id") WHERE "customers"."personal_data_removed_at" is null;--> statement-breakpoint
CREATE INDEX "payments_created_idx" ON "payments" USING btree ("created_at","id");--> statement-breakpoint
CREATE INDEX "payments_received_idx" ON "payments" USING btree ("received_on","created_at","id");--> statement-breakpoint
-- "Contains" search on names, numbers and references uses trigram indexes
-- from the pg_trgm extension, which Neon provides. If a database cannot add
-- it, this block is skipped as a whole and search still works, only without
-- these indexes, so a deploy never fails over it.
DO $$
BEGIN
  CREATE EXTENSION IF NOT EXISTS pg_trgm;
  CREATE INDEX IF NOT EXISTS "bookings_ref_trgm_idx" ON "bookings" USING gin ("ref" gin_trgm_ops);
  CREATE INDEX IF NOT EXISTS "bookings_name_trgm_idx" ON "bookings" USING gin ("customer_name" gin_trgm_ops);
  CREATE INDEX IF NOT EXISTS "bookings_phone_trgm_idx" ON "bookings" USING gin ("customer_phone" gin_trgm_ops);
  CREATE INDEX IF NOT EXISTS "customers_name_trgm_idx" ON "customers" USING gin ("name" gin_trgm_ops);
  CREATE INDEX IF NOT EXISTS "customers_phone_trgm_idx" ON "customers" USING gin ("phone" gin_trgm_ops);
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'pg_trgm not available (%): search works without trigram indexes', SQLERRM;
END $$;
