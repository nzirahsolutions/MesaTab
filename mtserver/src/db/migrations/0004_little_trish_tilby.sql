CREATE TABLE "words_sb" (
	"word_id" serial PRIMARY KEY NOT NULL,
	"tab_id" uuid NOT NULL,
	"word" text NOT NULL,
	CONSTRAINT "words_sb_tab_id_word_unique" UNIQUE("tab_id","word")
);
--> statement-breakpoint
ALTER TABLE "words_sb" ADD CONSTRAINT "words_sb_tab_id_tabs_sb_tab_id_fk" FOREIGN KEY ("tab_id") REFERENCES "public"."tabs_sb"("tab_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "words_sb_tabId_idx" ON "words_sb" USING btree ("tab_id");