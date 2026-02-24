CREATE TABLE "standings_sb" (
	"standing_id" serial PRIMARY KEY NOT NULL,
	"tab_id" uuid NOT NULL,
	"speller_id" integer NOT NULL,
	"total_score" integer DEFAULT 0 NOT NULL,
	"round_scores" text,
	"rank" integer,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "standings_sb_tab_id_speller_id_unique" UNIQUE("tab_id","speller_id")
);
--> statement-breakpoint
CREATE TABLE "tabs_wsdc" (
	"tab_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"slug" text NOT NULL,
	"event_id" uuid NOT NULL,
	CONSTRAINT "tabs_wsdc_event_id_slug_unique" UNIQUE("event_id","slug")
);
--> statement-breakpoint
CREATE TABLE "tabs_chess" (
	"tab_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"slug" text NOT NULL,
	"event_id" uuid NOT NULL,
	CONSTRAINT "tabs_chess_event_id_slug_unique" UNIQUE("event_id","slug")
);
--> statement-breakpoint
CREATE TABLE "tabs_ps" (
	"tab_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"slug" text NOT NULL,
	"event_id" uuid NOT NULL,
	CONSTRAINT "tabs_ps_event_id_slug_unique" UNIQUE("event_id","slug")
);
--> statement-breakpoint
CREATE TABLE "tabs_bp" (
	"tab_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"slug" text NOT NULL,
	"event_id" uuid NOT NULL,
	CONSTRAINT "tabs_bp_event_id_slug_unique" UNIQUE("event_id","slug")
);
--> statement-breakpoint
DROP INDEX "tabs_eventId_idx";--> statement-breakpoint
ALTER TABLE "standings_sb" ADD CONSTRAINT "standings_sb_tab_id_tabs_sb_tab_id_fk" FOREIGN KEY ("tab_id") REFERENCES "public"."tabs_sb"("tab_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "standings_sb" ADD CONSTRAINT "standings_sb_speller_id_spellers_speller_id_fk" FOREIGN KEY ("speller_id") REFERENCES "public"."spellers"("speller_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tabs_wsdc" ADD CONSTRAINT "tabs_wsdc_event_id_events_event_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("event_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tabs_chess" ADD CONSTRAINT "tabs_chess_event_id_events_event_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("event_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tabs_ps" ADD CONSTRAINT "tabs_ps_event_id_events_event_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("event_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tabs_bp" ADD CONSTRAINT "tabs_bp_event_id_events_event_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("event_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "standings_tabId_idx" ON "standings_sb" USING btree ("tab_id");--> statement-breakpoint
CREATE INDEX "standings_rank_idx" ON "standings_sb" USING btree ("rank");--> statement-breakpoint
CREATE INDEX "tabs_wsdc_eventId_idx" ON "tabs_wsdc" USING btree ("event_id");--> statement-breakpoint
CREATE INDEX "tabs_chess_eventId_idx" ON "tabs_chess" USING btree ("event_id");--> statement-breakpoint
CREATE INDEX "tabs_ps_eventId_idx" ON "tabs_ps" USING btree ("event_id");--> statement-breakpoint
CREATE INDEX "tabs_bp_eventId_idx" ON "tabs_bp" USING btree ("event_id");--> statement-breakpoint
CREATE INDEX "tabs_sb_eventId_idx" ON "tabs_sb" USING btree ("event_id");