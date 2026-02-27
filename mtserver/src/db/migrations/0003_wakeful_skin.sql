CREATE TABLE "tab_masters_sb" (
	"tab_master_id" serial PRIMARY KEY NOT NULL,
	"tab_id" uuid NOT NULL,
	"institution_id" integer NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	CONSTRAINT "tab_masters_sb_tab_id_tab_master_id_unique" UNIQUE("tab_id","tab_master_id"),
	CONSTRAINT "tab_masters_sb_tab_id_email_unique" UNIQUE("tab_id","email")
);
--> statement-breakpoint
ALTER TABLE "tab_masters_sb" ADD CONSTRAINT "tab_masters_sb_tab_id_tabs_sb_tab_id_fk" FOREIGN KEY ("tab_id") REFERENCES "public"."tabs_sb"("tab_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tab_masters_sb" ADD CONSTRAINT "tab_masters_sb_institution_id_institutions_sb_institution_id_fk" FOREIGN KEY ("institution_id") REFERENCES "public"."institutions_sb"("institution_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "tab_masters_sb_tabId_idx" ON "tab_masters_sb" USING btree ("tab_id");--> statement-breakpoint
CREATE INDEX "tab_masters_sb_institutionId_idx" ON "tab_masters_sb" USING btree ("institution_id");