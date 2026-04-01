CREATE TABLE IF NOT EXISTS "cup_categories_sb" (
	"cup_category_id" serial PRIMARY KEY NOT NULL,
	"tab_id" uuid NOT NULL,
	"cup_category" text,
	"order" integer DEFAULT 1 NOT NULL,
	CONSTRAINT "cup_categories_sb_tab_id_cup_category_unique" UNIQUE("tab_id","cup_category")
);
--> statement-breakpoint
ALTER TABLE "rounds_sb" ADD COLUMN IF NOT EXISTS "cup_category_id" integer;--> statement-breakpoint
ALTER TABLE "rounds_sb" ADD COLUMN IF NOT EXISTS "blind" boolean DEFAULT false NOT NULL;--> statement-breakpoint
DO $$
BEGIN
	IF NOT EXISTS (
		SELECT 1
		FROM pg_constraint
		WHERE conname = 'cup_categories_sb_tab_id_tabs_sb_tab_id_fk'
	) THEN
		ALTER TABLE "cup_categories_sb" ADD CONSTRAINT "cup_categories_sb_tab_id_tabs_sb_tab_id_fk" FOREIGN KEY ("tab_id") REFERENCES "public"."tabs_sb"("tab_id") ON DELETE cascade ON UPDATE no action;
	END IF;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "cups_tabId_idx" ON "cup_categories_sb" USING btree ("tab_id");--> statement-breakpoint
DO $$
BEGIN
	IF NOT EXISTS (
		SELECT 1
		FROM pg_constraint
		WHERE conname = 'rounds_sb_cup_category_id_cup_categories_sb_cup_category_id_fk'
	) THEN
		ALTER TABLE "rounds_sb" ADD CONSTRAINT "rounds_sb_cup_category_id_cup_categories_sb_cup_category_id_fk" FOREIGN KEY ("cup_category_id") REFERENCES "public"."cup_categories_sb"("cup_category_id") ON DELETE cascade ON UPDATE no action;
	END IF;
END $$;
