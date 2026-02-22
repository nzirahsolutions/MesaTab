CREATE TYPE "public"."round_type_sb" AS ENUM('Timed', 'Word Limit', 'Eliminator');--> statement-breakpoint
CREATE TYPE "public"."result_status_sb_enum" AS ENUM('Eliminated', 'Won');--> statement-breakpoint
CREATE TABLE "users" (
	"user_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"password_hash" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "events" (
	"event_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"organizer" text NOT NULL,
	"slug" text NOT NULL,
	"owner_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "events_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "tabs_sb" (
	"tab_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"slug" text NOT NULL,
	"event_id" uuid NOT NULL,
	CONSTRAINT "tabs_sb_event_id_slug_unique" UNIQUE("event_id","slug")
);
--> statement-breakpoint
CREATE TABLE "rounds_sb" (
	"round_id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"tab_id" uuid NOT NULL,
	"completed" boolean DEFAULT false NOT NULL,
	"breaks" boolean DEFAULT false NOT NULL,
	"type" "round_type_sb" NOT NULL,
	"time_limit" integer,
	"word_limit" integer,
	CONSTRAINT "rounds_sb_tab_id_round_id_unique" UNIQUE("tab_id","round_id"),
	CONSTRAINT "rounds_sb_type_limits_chk" CHECK ((
        ("rounds_sb"."type" = 'Timed' AND "rounds_sb"."time_limit" IS NOT NULL AND "rounds_sb"."word_limit" IS NULL) OR
        ("rounds_sb"."type" = 'Word Limit' AND "rounds_sb"."word_limit" IS NOT NULL AND "rounds_sb"."time_limit" IS NULL) OR
        ("rounds_sb"."type" = 'Eliminator' AND "rounds_sb"."time_limit" IS NULL AND "rounds_sb"."word_limit" IS NULL)
      ))
);
--> statement-breakpoint
CREATE TABLE "institutions_sb" (
	"institution_id" serial PRIMARY KEY NOT NULL,
	"tab_id" uuid NOT NULL,
	"name" text NOT NULL,
	"code" text NOT NULL,
	CONSTRAINT "institutions_sb_tab_id_code_unique" UNIQUE("tab_id","code")
);
--> statement-breakpoint
CREATE TABLE "spellers" (
	"speller_id" serial PRIMARY KEY NOT NULL,
	"tab_id" uuid NOT NULL,
	"institution_id" integer NOT NULL,
	"name" text NOT NULL,
	"email" text,
	CONSTRAINT "spellers_tab_id_speller_id_unique" UNIQUE("tab_id","speller_id")
);
--> statement-breakpoint
CREATE TABLE "judges_sb" (
	"judge_id" serial PRIMARY KEY NOT NULL,
	"tab_id" uuid NOT NULL,
	"institution_id" integer NOT NULL,
	"name" text NOT NULL,
	"email" text,
	CONSTRAINT "judges_sb_tab_id_judge_id_unique" UNIQUE("tab_id","judge_id")
);
--> statement-breakpoint
CREATE TABLE "rooms_sb" (
	"room_id" serial PRIMARY KEY NOT NULL,
	"tab_id" uuid NOT NULL,
	"name" text NOT NULL,
	CONSTRAINT "rooms_sb_tab_id_name_unique" UNIQUE("tab_id","name"),
	CONSTRAINT "rooms_sb_tab_id_room_id_unique" UNIQUE("tab_id","room_id")
);
--> statement-breakpoint
CREATE TABLE "draws_sb" (
	"draw_id" serial PRIMARY KEY NOT NULL,
	"tab_id" uuid NOT NULL,
	"room_id" integer NOT NULL,
	"round_id" integer NOT NULL,
	CONSTRAINT "draws_sb_tab_id_draw_id_unique" UNIQUE("tab_id","draw_id")
);
--> statement-breakpoint
CREATE TABLE "draw_spellers" (
	"id" serial PRIMARY KEY NOT NULL,
	"tab_id" uuid NOT NULL,
	"speller_id" integer NOT NULL,
	"draw_id" integer NOT NULL,
	CONSTRAINT "draw_spellers_draw_id_speller_id_unique" UNIQUE("draw_id","speller_id")
);
--> statement-breakpoint
CREATE TABLE "draw_judges_sb" (
	"id" serial PRIMARY KEY NOT NULL,
	"tab_id" uuid NOT NULL,
	"judge_id" integer NOT NULL,
	"draw_id" integer NOT NULL,
	CONSTRAINT "draw_judges_sb_draw_id_judge_id_unique" UNIQUE("draw_id","judge_id")
);
--> statement-breakpoint
CREATE TABLE "results_sb" (
	"result_id" serial PRIMARY KEY NOT NULL,
	"draw_speller_id" integer NOT NULL,
	"score" integer,
	"status" "result_status_sb_enum",
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "results_sb_draw_speller_id_unique" UNIQUE("draw_speller_id")
);
--> statement-breakpoint
ALTER TABLE "events" ADD CONSTRAINT "events_owner_id_users_user_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("user_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tabs_sb" ADD CONSTRAINT "tabs_sb_event_id_events_event_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("event_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rounds_sb" ADD CONSTRAINT "rounds_sb_tab_id_tabs_sb_tab_id_fk" FOREIGN KEY ("tab_id") REFERENCES "public"."tabs_sb"("tab_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "institutions_sb" ADD CONSTRAINT "institutions_sb_tab_id_tabs_sb_tab_id_fk" FOREIGN KEY ("tab_id") REFERENCES "public"."tabs_sb"("tab_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "spellers" ADD CONSTRAINT "spellers_tab_id_tabs_sb_tab_id_fk" FOREIGN KEY ("tab_id") REFERENCES "public"."tabs_sb"("tab_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "spellers" ADD CONSTRAINT "spellers_institution_id_institutions_sb_institution_id_fk" FOREIGN KEY ("institution_id") REFERENCES "public"."institutions_sb"("institution_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "judges_sb" ADD CONSTRAINT "judges_sb_tab_id_tabs_sb_tab_id_fk" FOREIGN KEY ("tab_id") REFERENCES "public"."tabs_sb"("tab_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "judges_sb" ADD CONSTRAINT "judges_sb_institution_id_institutions_sb_institution_id_fk" FOREIGN KEY ("institution_id") REFERENCES "public"."institutions_sb"("institution_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rooms_sb" ADD CONSTRAINT "rooms_sb_tab_id_tabs_sb_tab_id_fk" FOREIGN KEY ("tab_id") REFERENCES "public"."tabs_sb"("tab_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "draws_sb" ADD CONSTRAINT "draws_sb_tab_id_tabs_sb_tab_id_fk" FOREIGN KEY ("tab_id") REFERENCES "public"."tabs_sb"("tab_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "draws_sb" ADD CONSTRAINT "draws_sb_room_id_rooms_sb_room_id_fk" FOREIGN KEY ("room_id") REFERENCES "public"."rooms_sb"("room_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "draws_sb" ADD CONSTRAINT "draws_sb_round_id_rounds_sb_round_id_fk" FOREIGN KEY ("round_id") REFERENCES "public"."rounds_sb"("round_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "draws_sb" ADD CONSTRAINT "draws_tab_room_fk" FOREIGN KEY ("tab_id","room_id") REFERENCES "public"."rooms_sb"("tab_id","room_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "draws_sb" ADD CONSTRAINT "draws_tab_round_fk" FOREIGN KEY ("tab_id","round_id") REFERENCES "public"."rounds_sb"("tab_id","round_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "draw_spellers" ADD CONSTRAINT "draw_spellers_tab_id_tabs_sb_tab_id_fk" FOREIGN KEY ("tab_id") REFERENCES "public"."tabs_sb"("tab_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "draw_spellers" ADD CONSTRAINT "draw_spellers_speller_id_spellers_speller_id_fk" FOREIGN KEY ("speller_id") REFERENCES "public"."spellers"("speller_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "draw_spellers" ADD CONSTRAINT "draw_spellers_draw_id_draws_sb_draw_id_fk" FOREIGN KEY ("draw_id") REFERENCES "public"."draws_sb"("draw_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "draw_spellers" ADD CONSTRAINT "draw_spellers_tab_speller_fk" FOREIGN KEY ("tab_id","speller_id") REFERENCES "public"."spellers"("tab_id","speller_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "draw_spellers" ADD CONSTRAINT "draw_spellers_tab_draw_fk" FOREIGN KEY ("tab_id","draw_id") REFERENCES "public"."draws_sb"("tab_id","draw_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "draw_judges_sb" ADD CONSTRAINT "draw_judges_sb_tab_id_tabs_sb_tab_id_fk" FOREIGN KEY ("tab_id") REFERENCES "public"."tabs_sb"("tab_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "draw_judges_sb" ADD CONSTRAINT "draw_judges_sb_judge_id_judges_sb_judge_id_fk" FOREIGN KEY ("judge_id") REFERENCES "public"."judges_sb"("judge_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "draw_judges_sb" ADD CONSTRAINT "draw_judges_sb_draw_id_draws_sb_draw_id_fk" FOREIGN KEY ("draw_id") REFERENCES "public"."draws_sb"("draw_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "draw_judges_sb" ADD CONSTRAINT "draw_judges_tab_judge_fk" FOREIGN KEY ("tab_id","judge_id") REFERENCES "public"."judges_sb"("tab_id","judge_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "draw_judges_sb" ADD CONSTRAINT "draw_judges_tab_draw_fk" FOREIGN KEY ("tab_id","draw_id") REFERENCES "public"."draws_sb"("tab_id","draw_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "results_sb" ADD CONSTRAINT "results_sb_draw_speller_id_draw_spellers_id_fk" FOREIGN KEY ("draw_speller_id") REFERENCES "public"."draw_spellers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "events_ownerId_idx" ON "events" USING btree ("owner_id");--> statement-breakpoint
CREATE INDEX "tabs_eventId_idx" ON "tabs_sb" USING btree ("event_id");--> statement-breakpoint
CREATE INDEX "rounds_tabId_idx" ON "rounds_sb" USING btree ("tab_id");--> statement-breakpoint
CREATE INDEX "institutions_tabId_idx" ON "institutions_sb" USING btree ("tab_id");--> statement-breakpoint
CREATE INDEX "spellers_tabId_idx" ON "spellers" USING btree ("tab_id");--> statement-breakpoint
CREATE INDEX "spellers_institutionId_idx" ON "spellers" USING btree ("institution_id");--> statement-breakpoint
CREATE UNIQUE INDEX "spellers_tab_email_uq" ON "spellers" USING btree ("tab_id","email") WHERE "spellers"."email" is not null;--> statement-breakpoint
CREATE INDEX "judges_sb_tabId_idx" ON "judges_sb" USING btree ("tab_id");--> statement-breakpoint
CREATE INDEX "judges_sb_institutionId_idx" ON "judges_sb" USING btree ("institution_id");--> statement-breakpoint
CREATE UNIQUE INDEX "judges_sb_tab_email_uq" ON "judges_sb" USING btree ("tab_id","email") WHERE "judges_sb"."email" is not null;--> statement-breakpoint
CREATE INDEX "rooms_sb_tabId_idx" ON "rooms_sb" USING btree ("tab_id");--> statement-breakpoint
CREATE INDEX "draws_tabId_idx" ON "draws_sb" USING btree ("tab_id");--> statement-breakpoint
CREATE INDEX "draws_roomId_idx" ON "draws_sb" USING btree ("room_id");--> statement-breakpoint
CREATE INDEX "draws_roundId_idx" ON "draws_sb" USING btree ("round_id");--> statement-breakpoint
CREATE INDEX "ds_tab_id_idx" ON "draw_spellers" USING btree ("tab_id");--> statement-breakpoint
CREATE INDEX "ds_speller_id_idx" ON "draw_spellers" USING btree ("speller_id");--> statement-breakpoint
CREATE INDEX "ds_draw_id_idx" ON "draw_spellers" USING btree ("draw_id");--> statement-breakpoint
CREATE INDEX "dj_tab_id_idx" ON "draw_judges_sb" USING btree ("tab_id");--> statement-breakpoint
CREATE INDEX "dj_judge_id_idx" ON "draw_judges_sb" USING btree ("judge_id");--> statement-breakpoint
CREATE INDEX "dj_draw_id_idx" ON "draw_judges_sb" USING btree ("draw_id");