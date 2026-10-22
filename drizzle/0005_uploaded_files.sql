CREATE TABLE "files" (
	"id" uuid PRIMARY KEY NOT NULL,
	"booking_id" uuid NOT NULL,
	"kind" text NOT NULL,
	"payment_id" uuid,
	"pathname" text NOT NULL,
	"width" integer NOT NULL,
	"height" integer NOT NULL,
	"bytes" integer NOT NULL,
	"created_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "files_pathname_unique" UNIQUE("pathname")
);
--> statement-breakpoint
ALTER TABLE "files" ADD CONSTRAINT "files_booking_id_bookings_id_fk" FOREIGN KEY ("booking_id") REFERENCES "public"."bookings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "files" ADD CONSTRAINT "files_payment_id_payments_id_fk" FOREIGN KEY ("payment_id") REFERENCES "public"."payments"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "files" ADD CONSTRAINT "files_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "files_booking_idx" ON "files" USING btree ("booking_id");--> statement-breakpoint
CREATE INDEX "files_payment_idx" ON "files" USING btree ("payment_id") WHERE "files"."payment_id" is not null;--> statement-breakpoint
ALTER TABLE "payments" DROP COLUMN "screenshot_url";