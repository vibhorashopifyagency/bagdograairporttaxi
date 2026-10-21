ALTER TABLE "payments" ADD COLUMN "driver_id" uuid;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_driver_id_drivers_id_fk" FOREIGN KEY ("driver_id") REFERENCES "public"."drivers"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "payments_driver_idx" ON "payments" USING btree ("driver_id") WHERE "payments"."driver_id" is not null;