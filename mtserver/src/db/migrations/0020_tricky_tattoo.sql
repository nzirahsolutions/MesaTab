ALTER TABLE "cup_categories_sb" RENAME COLUMN "cup_capacity" TO "break_capacity";--> statement-breakpoint
ALTER TABLE "cup_categories_sb" RENAME COLUMN "order" TO "break_number";--> statement-breakpoint
ALTER TABLE "rounds_sb" ALTER COLUMN "break_phase" SET DATA TYPE text;--> statement-breakpoint
DROP TYPE "public"."break_phase_sb";--> statement-breakpoint
CREATE TYPE "public"."break_phase_sb" AS ENUM('Triples', 'Doubles', 'Octos', 'Quarters', 'Semis', 'Finals');--> statement-breakpoint
ALTER TABLE "rounds_sb" ALTER COLUMN "break_phase" SET DATA TYPE "public"."break_phase_sb" USING "break_phase"::"public"."break_phase_sb";