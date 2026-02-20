CREATE TYPE "public"."tabTrack" AS ENUM('Spelling Bee', 'Public Speaking', 'Chess', 'BP Debate', 'WSDC Debate');--> statement-breakpoint
CREATE TABLE "tabs" (
	"tab_id" serial PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"track" "tabTrack" NOT NULL,
	"slug" text NOT NULL,
	"event_id" uuid NOT NULL,
	CONSTRAINT "tabs_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
ALTER TABLE "tabs" ADD CONSTRAINT "tabs_event_id_events_event_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("event_id") ON DELETE no action ON UPDATE no action;