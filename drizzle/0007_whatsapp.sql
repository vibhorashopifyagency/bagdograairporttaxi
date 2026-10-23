CREATE TABLE "whatsapp_inbound" (
	"wa_number" text PRIMARY KEY NOT NULL,
	"last_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "whatsapp_messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"booking_id" uuid NOT NULL,
	"send_id" uuid NOT NULL,
	"wa_id" text NOT NULL,
	"kind" text NOT NULL,
	"status" text DEFAULT 'accepted' NOT NULL,
	"error" text,
	"sent_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"status_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "whatsapp_messages_wa_id_unique" UNIQUE("wa_id")
);
--> statement-breakpoint
ALTER TABLE "whatsapp_messages" ADD CONSTRAINT "whatsapp_messages_booking_id_bookings_id_fk" FOREIGN KEY ("booking_id") REFERENCES "public"."bookings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "whatsapp_messages" ADD CONSTRAINT "whatsapp_messages_sent_by_user_id_fk" FOREIGN KEY ("sent_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "whatsapp_messages_booking_idx" ON "whatsapp_messages" USING btree ("booking_id","created_at");