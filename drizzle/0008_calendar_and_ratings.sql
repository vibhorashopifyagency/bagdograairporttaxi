CREATE TABLE "customer_tag_links" (
	"customer_id" uuid NOT NULL,
	"tag_id" uuid NOT NULL,
	CONSTRAINT "customer_tag_links_customer_id_tag_id_pk" PRIMARY KEY("customer_id","tag_id")
);
--> statement-breakpoint
CREATE TABLE "customer_tags" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"tone" text DEFAULT 'grey' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "driver_time_off" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"driver_id" uuid NOT NULL,
	"starts_at" timestamp with time zone NOT NULL,
	"ends_at" timestamp with time zone NOT NULL,
	"reason" text NOT NULL,
	"note" text,
	"created_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "bookings" ADD COLUMN "busy_until" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "customers" ADD COLUMN "rating" smallint;--> statement-breakpoint
ALTER TABLE "customers" ADD COLUMN "no_offers" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "drivers" ADD COLUMN "partner" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "customer_tag_links" ADD CONSTRAINT "customer_tag_links_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customer_tag_links" ADD CONSTRAINT "customer_tag_links_tag_id_customer_tags_id_fk" FOREIGN KEY ("tag_id") REFERENCES "public"."customer_tags"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "driver_time_off" ADD CONSTRAINT "driver_time_off_driver_id_drivers_id_fk" FOREIGN KEY ("driver_id") REFERENCES "public"."drivers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "driver_time_off" ADD CONSTRAINT "driver_time_off_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "customer_tag_links_tag_idx" ON "customer_tag_links" USING btree ("tag_id","customer_id");--> statement-breakpoint
CREATE UNIQUE INDEX "customer_tags_name_idx" ON "customer_tags" USING btree (lower("name"));--> statement-breakpoint
CREATE INDEX "driver_time_off_ends_idx" ON "driver_time_off" USING btree ("ends_at","starts_at");--> statement-breakpoint
ALTER TABLE "customers" ADD CONSTRAINT "customers_rating_range" CHECK ("customers"."rating" between 1 and 5);--> statement-breakpoint
-- A first set of customer tags to start from; the office renames, adds and removes them on the Customers page.
INSERT INTO "customer_tags" ("name", "tone") VALUES ('Family', 'lime'), ('Honeymoon', 'rose'), ('Group', 'blue'), ('Corporate', 'grey'), ('VIP', 'amber') ON CONFLICT DO NOTHING;
