CREATE TABLE "content_items" (
	"type" text NOT NULL,
	"key" text NOT NULL,
	"published" jsonb,
	"deleted" boolean DEFAULT false NOT NULL,
	"base_hash" text,
	"published_at" timestamp with time zone,
	"published_by" text,
	"draft" jsonb,
	"draft_action" text,
	"updated_by" text,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "content_items_type_key_pk" PRIMARY KEY("type","key")
);
--> statement-breakpoint
CREATE TABLE "content_versions" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"type" text NOT NULL,
	"key" text NOT NULL,
	"action" text NOT NULL,
	"data" jsonb,
	"published_by" text,
	"published_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "content_items" ADD CONSTRAINT "content_items_published_by_user_id_fk" FOREIGN KEY ("published_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "content_items" ADD CONSTRAINT "content_items_updated_by_user_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "content_versions" ADD CONSTRAINT "content_versions_published_by_user_id_fk" FOREIGN KEY ("published_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "content_items_draft_idx" ON "content_items" USING btree ("type") WHERE "content_items"."draft_action" is not null;--> statement-breakpoint
CREATE INDEX "content_versions_item_idx" ON "content_versions" USING btree ("type","key","id");