CREATE TYPE "public"."break_phase_sb" AS ENUM('Octo-Finals', 'Quarter-Finals', 'Semi-Finals', 'Finals');--> statement-breakpoint
ALTER TABLE "rounds_sb" ADD COLUMN IF NOT EXISTS "break_category" text;--> statement-breakpoint
ALTER TABLE "rounds_sb" ADD COLUMN IF NOT EXISTS "break_phase" "break_phase_sb";
