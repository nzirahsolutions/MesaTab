CREATE TYPE "public"."break_phase_ps" AS ENUM('Triples', 'Doubles', 'Octos', 'Quarters', 'Semis', 'Finals');--> statement-breakpoint
CREATE TYPE "public"."result_status_ps_enum" AS ENUM('Eliminated', 'Pass', 'Incomplete');--> statement-breakpoint
CREATE TYPE "public"."speech_type_ps_enum" AS ENUM('narrative', 'dilemma', 'philosophical', 'informative', 'inspirational', 'impromptu', 'selling', 'special occassion', 'creative', 'other');--> statement-breakpoint
CREATE TABLE "institutions_ps" (
	"institution_id" serial PRIMARY KEY NOT NULL,
	"tab_id" uuid NOT NULL,
	"name" text NOT NULL,
	"code" text NOT NULL,
	CONSTRAINT "institutions_ps_tab_id_code_unique" UNIQUE("tab_id","code")
);
--> statement-breakpoint
CREATE TABLE "judges_ps" (
	"judge_id" serial PRIMARY KEY NOT NULL,
	"tab_id" uuid NOT NULL,
	"institution_id" integer NOT NULL,
	"name" text NOT NULL,
	"email" text,
	"available" boolean DEFAULT true NOT NULL,
	CONSTRAINT "judges_ps_tab_id_judge_id_unique" UNIQUE("tab_id","judge_id")
);
--> statement-breakpoint
CREATE TABLE "tab_masters_ps" (
	"tab_master_id" serial PRIMARY KEY NOT NULL,
	"tab_id" uuid NOT NULL,
	"institution_id" integer NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	CONSTRAINT "tab_masters_ps_tab_id_tab_master_id_unique" UNIQUE("tab_id","tab_master_id"),
	CONSTRAINT "tab_masters_ps_tab_id_email_unique" UNIQUE("tab_id","email")
);
--> statement-breakpoint
CREATE TABLE "speakers_ps" (
	"speaker_id" serial PRIMARY KEY NOT NULL,
	"tab_id" uuid NOT NULL,
	"institution_id" integer NOT NULL,
	"name" text NOT NULL,
	"email" text,
	"available" boolean DEFAULT true NOT NULL,
	CONSTRAINT "speakers_ps_tab_id_speaker_id_unique" UNIQUE("tab_id","speaker_id")
);
--> statement-breakpoint
CREATE TABLE "rooms_ps" (
	"room_id" serial PRIMARY KEY NOT NULL,
	"tab_id" uuid NOT NULL,
	"name" text NOT NULL,
	"available" boolean DEFAULT true NOT NULL,
	CONSTRAINT "rooms_ps_tab_id_name_unique" UNIQUE("tab_id","name"),
	CONSTRAINT "rooms_ps_tab_id_room_id_unique" UNIQUE("tab_id","room_id")
);
--> statement-breakpoint
CREATE TABLE "cup_categories_ps" (
	"cup_category_id" serial PRIMARY KEY NOT NULL,
	"tab_id" uuid NOT NULL,
	"cup_category" text,
	"break_capacity" integer DEFAULT 5 NOT NULL,
	"break_number" integer DEFAULT 1 NOT NULL,
	"cup_order" integer DEFAULT 1 NOT NULL,
	CONSTRAINT "cup_categories_ps_tab_id_cup_category_unique" UNIQUE("tab_id","cup_category"),
	CONSTRAINT "cup_categories_ps_tab_id_cup_order_unique" UNIQUE("tab_id","cup_order")
);
--> statement-breakpoint
CREATE TABLE "rounds_ps" (
	"round_id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"number" integer NOT NULL,
	"breaks" boolean DEFAULT false NOT NULL,
	"cup_category_id" integer,
	"break_phase" "break_phase_ps",
	"tab_id" uuid NOT NULL,
	"completed" boolean DEFAULT false NOT NULL,
	"speech_duration" integer NOT NULL,
	"blind" boolean DEFAULT false NOT NULL,
	CONSTRAINT "rounds_ps_tab_id_round_id_unique" UNIQUE("tab_id","round_id"),
	CONSTRAINT "rounds_ps_tab_id_cup_category_id_number_unique" UNIQUE("tab_id","cup_category_id","number"),
	CONSTRAINT "rounds_ps_tab_id_break_phase_cup_category_id_unique" UNIQUE("tab_id","break_phase","cup_category_id"),
	CONSTRAINT "rounds_ps_duration_chk" CHECK ("rounds_ps"."speech_duration" > 0)
);
--> statement-breakpoint
CREATE TABLE "draws_ps" (
	"draw_id" serial PRIMARY KEY NOT NULL,
	"tab_id" uuid NOT NULL,
	"room_id" integer NOT NULL,
	"round_id" integer NOT NULL,
	CONSTRAINT "draws_ps_tab_id_draw_id_unique" UNIQUE("tab_id","draw_id")
);
--> statement-breakpoint
CREATE TABLE "draw_speakers_ps" (
	"id" serial PRIMARY KEY NOT NULL,
	"tab_id" uuid NOT NULL,
	"speaker_id" integer NOT NULL,
	"draw_id" integer NOT NULL,
	"room_id" integer NOT NULL,
	CONSTRAINT "draw_speakers_ps_draw_id_speaker_id_unique" UNIQUE("draw_id","speaker_id")
);
--> statement-breakpoint
CREATE TABLE "draw_judges_ps" (
	"id" serial PRIMARY KEY NOT NULL,
	"tab_id" uuid NOT NULL,
	"judge_id" integer NOT NULL,
	"draw_id" integer NOT NULL,
	"room_id" integer NOT NULL,
	CONSTRAINT "draw_judges_ps_draw_id_judge_id_unique" UNIQUE("draw_id","judge_id")
);
--> statement-breakpoint
CREATE TABLE "results_ps" (
	"result_id" serial PRIMARY KEY NOT NULL,
	"draw_speaker_id" integer NOT NULL,
	"score" integer NOT NULL,
	"status" "result_status_ps_enum",
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "results_ps_draw_speaker_id_unique" UNIQUE("draw_speaker_id")
);
--> statement-breakpoint
CREATE TABLE "standings_ps" (
	"standing_id" serial PRIMARY KEY NOT NULL,
	"tab_id" uuid NOT NULL,
	"speaker_id" integer NOT NULL,
	"total_score" integer DEFAULT 0 NOT NULL,
	"average_score" real DEFAULT 0 NOT NULL,
	"appearances" integer DEFAULT 0 NOT NULL,
	"round_scores" text,
	"rank" integer,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "standings_ps_tab_id_speaker_id_unique" UNIQUE("tab_id","speaker_id")
);
--> statement-breakpoint
CREATE TABLE "speech_prompts_ps" (
	"prompt_id" serial PRIMARY KEY NOT NULL,
	"tab_id" uuid NOT NULL,
	"round_id" integer NOT NULL,
	"speech_prompt" text NOT NULL,
	"speech_type" "speech_type_ps_enum" NOT NULL,
	"visible" boolean DEFAULT false NOT NULL,
	CONSTRAINT "speech_prompts_ps_round_id_unique" UNIQUE("round_id"),
	CONSTRAINT "speech_prompts_ps_tab_id_round_id_unique" UNIQUE("tab_id","round_id"),
	CONSTRAINT "speech_prompts_ps_tab_id_speech_prompt_unique" UNIQUE("tab_id","speech_prompt")
);
--> statement-breakpoint
ALTER TABLE "tabs_ps" ADD COLUMN "min_score" integer DEFAULT 30 NOT NULL;--> statement-breakpoint
ALTER TABLE "tabs_ps" ADD COLUMN "max_score" integer DEFAULT 90 NOT NULL;--> statement-breakpoint
ALTER TABLE "institutions_ps" ADD CONSTRAINT "institutions_ps_tab_id_tabs_ps_tab_id_fk" FOREIGN KEY ("tab_id") REFERENCES "public"."tabs_ps"("tab_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "judges_ps" ADD CONSTRAINT "judges_ps_tab_id_tabs_ps_tab_id_fk" FOREIGN KEY ("tab_id") REFERENCES "public"."tabs_ps"("tab_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "judges_ps" ADD CONSTRAINT "judges_ps_institution_id_institutions_ps_institution_id_fk" FOREIGN KEY ("institution_id") REFERENCES "public"."institutions_ps"("institution_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tab_masters_ps" ADD CONSTRAINT "tab_masters_ps_tab_id_tabs_ps_tab_id_fk" FOREIGN KEY ("tab_id") REFERENCES "public"."tabs_ps"("tab_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tab_masters_ps" ADD CONSTRAINT "tab_masters_ps_institution_id_institutions_ps_institution_id_fk" FOREIGN KEY ("institution_id") REFERENCES "public"."institutions_ps"("institution_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "speakers_ps" ADD CONSTRAINT "speakers_ps_tab_id_tabs_ps_tab_id_fk" FOREIGN KEY ("tab_id") REFERENCES "public"."tabs_ps"("tab_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "speakers_ps" ADD CONSTRAINT "speakers_ps_institution_id_institutions_ps_institution_id_fk" FOREIGN KEY ("institution_id") REFERENCES "public"."institutions_ps"("institution_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rooms_ps" ADD CONSTRAINT "rooms_ps_tab_id_tabs_ps_tab_id_fk" FOREIGN KEY ("tab_id") REFERENCES "public"."tabs_ps"("tab_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cup_categories_ps" ADD CONSTRAINT "cup_categories_ps_tab_id_tabs_ps_tab_id_fk" FOREIGN KEY ("tab_id") REFERENCES "public"."tabs_ps"("tab_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rounds_ps" ADD CONSTRAINT "rounds_ps_cup_category_id_cup_categories_ps_cup_category_id_fk" FOREIGN KEY ("cup_category_id") REFERENCES "public"."cup_categories_ps"("cup_category_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rounds_ps" ADD CONSTRAINT "rounds_ps_tab_id_tabs_ps_tab_id_fk" FOREIGN KEY ("tab_id") REFERENCES "public"."tabs_ps"("tab_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "draws_ps" ADD CONSTRAINT "draws_ps_tab_id_tabs_ps_tab_id_fk" FOREIGN KEY ("tab_id") REFERENCES "public"."tabs_ps"("tab_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "draws_ps" ADD CONSTRAINT "draws_ps_room_id_rooms_ps_room_id_fk" FOREIGN KEY ("room_id") REFERENCES "public"."rooms_ps"("room_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "draws_ps" ADD CONSTRAINT "draws_ps_round_id_rounds_ps_round_id_fk" FOREIGN KEY ("round_id") REFERENCES "public"."rounds_ps"("round_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "draws_ps" ADD CONSTRAINT "draws_ps_tab_room_fk" FOREIGN KEY ("tab_id","room_id") REFERENCES "public"."rooms_ps"("tab_id","room_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "draws_ps" ADD CONSTRAINT "draws_ps_tab_round_fk" FOREIGN KEY ("tab_id","round_id") REFERENCES "public"."rounds_ps"("tab_id","round_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "draw_speakers_ps" ADD CONSTRAINT "draw_speakers_ps_tab_id_tabs_ps_tab_id_fk" FOREIGN KEY ("tab_id") REFERENCES "public"."tabs_ps"("tab_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "draw_speakers_ps" ADD CONSTRAINT "draw_speakers_ps_speaker_id_speakers_ps_speaker_id_fk" FOREIGN KEY ("speaker_id") REFERENCES "public"."speakers_ps"("speaker_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "draw_speakers_ps" ADD CONSTRAINT "draw_speakers_ps_draw_id_draws_ps_draw_id_fk" FOREIGN KEY ("draw_id") REFERENCES "public"."draws_ps"("draw_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "draw_speakers_ps" ADD CONSTRAINT "draw_speakers_ps_room_id_rooms_ps_room_id_fk" FOREIGN KEY ("room_id") REFERENCES "public"."rooms_ps"("room_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "draw_speakers_ps" ADD CONSTRAINT "draw_speakers_ps_tab_speaker_fk" FOREIGN KEY ("tab_id","speaker_id") REFERENCES "public"."speakers_ps"("tab_id","speaker_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "draw_speakers_ps" ADD CONSTRAINT "draw_speakers_ps_tab_draw_fk" FOREIGN KEY ("tab_id","draw_id") REFERENCES "public"."draws_ps"("tab_id","draw_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "draw_judges_ps" ADD CONSTRAINT "draw_judges_ps_tab_id_tabs_ps_tab_id_fk" FOREIGN KEY ("tab_id") REFERENCES "public"."tabs_ps"("tab_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "draw_judges_ps" ADD CONSTRAINT "draw_judges_ps_judge_id_judges_ps_judge_id_fk" FOREIGN KEY ("judge_id") REFERENCES "public"."judges_ps"("judge_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "draw_judges_ps" ADD CONSTRAINT "draw_judges_ps_draw_id_draws_ps_draw_id_fk" FOREIGN KEY ("draw_id") REFERENCES "public"."draws_ps"("draw_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "draw_judges_ps" ADD CONSTRAINT "draw_judges_ps_room_id_rooms_ps_room_id_fk" FOREIGN KEY ("room_id") REFERENCES "public"."rooms_ps"("room_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "draw_judges_ps" ADD CONSTRAINT "draw_judges_ps_tab_judge_fk" FOREIGN KEY ("tab_id","judge_id") REFERENCES "public"."judges_ps"("tab_id","judge_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "draw_judges_ps" ADD CONSTRAINT "draw_judges_ps_tab_draw_fk" FOREIGN KEY ("tab_id","draw_id") REFERENCES "public"."draws_ps"("tab_id","draw_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "results_ps" ADD CONSTRAINT "results_ps_draw_speaker_id_draw_speakers_ps_id_fk" FOREIGN KEY ("draw_speaker_id") REFERENCES "public"."draw_speakers_ps"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "standings_ps" ADD CONSTRAINT "standings_ps_tab_id_tabs_ps_tab_id_fk" FOREIGN KEY ("tab_id") REFERENCES "public"."tabs_ps"("tab_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "standings_ps" ADD CONSTRAINT "standings_ps_speaker_id_speakers_ps_speaker_id_fk" FOREIGN KEY ("speaker_id") REFERENCES "public"."speakers_ps"("speaker_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "speech_prompts_ps" ADD CONSTRAINT "speech_prompts_ps_tab_id_tabs_ps_tab_id_fk" FOREIGN KEY ("tab_id") REFERENCES "public"."tabs_ps"("tab_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "speech_prompts_ps" ADD CONSTRAINT "speech_prompts_ps_round_id_rounds_ps_round_id_fk" FOREIGN KEY ("round_id") REFERENCES "public"."rounds_ps"("round_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "speech_prompts_ps" ADD CONSTRAINT "speech_prompts_ps_tab_round_fk" FOREIGN KEY ("tab_id","round_id") REFERENCES "public"."rounds_ps"("tab_id","round_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "institutions_ps_tabId_idx" ON "institutions_ps" USING btree ("tab_id");--> statement-breakpoint
CREATE INDEX "judges_ps_tabId_idx" ON "judges_ps" USING btree ("tab_id");--> statement-breakpoint
CREATE INDEX "judges_ps_institutionId_idx" ON "judges_ps" USING btree ("institution_id");--> statement-breakpoint
CREATE UNIQUE INDEX "judges_ps_tab_email_uq" ON "judges_ps" USING btree ("tab_id","email") WHERE "judges_ps"."email" is not null;--> statement-breakpoint
CREATE INDEX "tab_masters_ps_tabId_idx" ON "tab_masters_ps" USING btree ("tab_id");--> statement-breakpoint
CREATE INDEX "tab_masters_ps_institutionId_idx" ON "tab_masters_ps" USING btree ("institution_id");--> statement-breakpoint
CREATE INDEX "speakers_ps_tabId_idx" ON "speakers_ps" USING btree ("tab_id");--> statement-breakpoint
CREATE INDEX "speakers_ps_institutionId_idx" ON "speakers_ps" USING btree ("institution_id");--> statement-breakpoint
CREATE UNIQUE INDEX "speakers_ps_tab_email_uq" ON "speakers_ps" USING btree ("tab_id","email") WHERE "speakers_ps"."email" is not null;--> statement-breakpoint
CREATE INDEX "rooms_ps_tabId_idx" ON "rooms_ps" USING btree ("tab_id");--> statement-breakpoint
CREATE INDEX "cups_ps_tabId_idx" ON "cup_categories_ps" USING btree ("tab_id");--> statement-breakpoint
CREATE INDEX "rounds_ps_tabId_idx" ON "rounds_ps" USING btree ("tab_id");--> statement-breakpoint
CREATE INDEX "rounds_ps_tab_number_idx" ON "rounds_ps" USING btree ("tab_id","number");--> statement-breakpoint
CREATE INDEX "draws_ps_tabId_idx" ON "draws_ps" USING btree ("tab_id");--> statement-breakpoint
CREATE INDEX "draws_ps_roomId_idx" ON "draws_ps" USING btree ("room_id");--> statement-breakpoint
CREATE INDEX "draws_ps_roundId_idx" ON "draws_ps" USING btree ("round_id");--> statement-breakpoint
CREATE INDEX "dsp_tab_id_idx" ON "draw_speakers_ps" USING btree ("tab_id");--> statement-breakpoint
CREATE INDEX "dsp_speaker_id_idx" ON "draw_speakers_ps" USING btree ("speaker_id");--> statement-breakpoint
CREATE INDEX "dsp_draw_id_idx" ON "draw_speakers_ps" USING btree ("draw_id");--> statement-breakpoint
CREATE INDEX "dsp_room_id_idx" ON "draw_speakers_ps" USING btree ("room_id");--> statement-breakpoint
CREATE INDEX "djp_tab_id_idx" ON "draw_judges_ps" USING btree ("tab_id");--> statement-breakpoint
CREATE INDEX "djp_judge_id_idx" ON "draw_judges_ps" USING btree ("judge_id");--> statement-breakpoint
CREATE INDEX "djp_draw_id_idx" ON "draw_judges_ps" USING btree ("draw_id");--> statement-breakpoint
CREATE INDEX "djp_room_id_idx" ON "draw_judges_ps" USING btree ("room_id");--> statement-breakpoint
CREATE INDEX "standings_ps_tabId_idx" ON "standings_ps" USING btree ("tab_id");--> statement-breakpoint
CREATE INDEX "standings_ps_rank_idx" ON "standings_ps" USING btree ("rank");--> statement-breakpoint
CREATE INDEX "speech_prompts_ps_tabId_idx" ON "speech_prompts_ps" USING btree ("tab_id");--> statement-breakpoint
CREATE INDEX "speech_prompts_ps_roundId_idx" ON "speech_prompts_ps" USING btree ("round_id");--> statement-breakpoint
ALTER TABLE "tabs_ps" ADD CONSTRAINT "tabs_ps_score_range_chk" CHECK ("tabs_ps"."min_score" >= 0 AND "tabs_ps"."max_score" >= "tabs_ps"."min_score");