CREATE TABLE "driver_payouts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"driver_id" uuid NOT NULL,
	"kind" text NOT NULL,
	"amount" integer NOT NULL,
	"method" text NOT NULL,
	"paid_on" date NOT NULL,
	"reference" text,
	"note" text,
	"reverses_payout_id" uuid,
	"created_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "drivers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"phone" text,
	"vehicle_number" text,
	"vehicle" text,
	"pay_type" text DEFAULT 'percent' NOT NULL,
	"pay_value" integer,
	"notes" text,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "bookings" ADD COLUMN "driver_id" uuid;--> statement-breakpoint
ALTER TABLE "bookings" ADD COLUMN "driver_pay" integer;--> statement-breakpoint
ALTER TABLE "driver_payouts" ADD CONSTRAINT "driver_payouts_driver_id_drivers_id_fk" FOREIGN KEY ("driver_id") REFERENCES "public"."drivers"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "driver_payouts" ADD CONSTRAINT "driver_payouts_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "driver_payouts_driver_idx" ON "driver_payouts" USING btree ("driver_id","paid_on");--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_driver_id_drivers_id_fk" FOREIGN KEY ("driver_id") REFERENCES "public"."drivers"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "bookings_driver_idx" ON "bookings" USING btree ("driver_id","pickup_date");--> statement-breakpoint
-- Drivers typed on bookings before the drivers list existed become entries in
-- it (newest phone and car number per name), with their pay not set yet, and
-- their bookings are linked to them.
INSERT INTO "drivers" ("name", "phone", "vehicle_number")
SELECT DISTINCT ON (lower(trim("driver_name"))) trim("driver_name"), "driver_phone", "vehicle_number"
FROM "bookings"
WHERE "driver_name" IS NOT NULL AND trim("driver_name") <> ''
ORDER BY lower(trim("driver_name")), "updated_at" DESC;--> statement-breakpoint
UPDATE "bookings" SET "driver_id" = d."id"
FROM "drivers" d
WHERE "bookings"."driver_name" IS NOT NULL AND lower(trim("bookings"."driver_name")) = lower(d."name");
