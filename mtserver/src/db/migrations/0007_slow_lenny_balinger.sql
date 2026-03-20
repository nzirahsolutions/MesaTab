ALTER TABLE "results_sb" ALTER COLUMN "status" SET DATA TYPE text;--> statement-breakpoint
DROP TYPE "public"."result_status_sb_enum";--> statement-breakpoint
CREATE TYPE "public"."result_status_sb_enum" AS ENUM('Eliminated', 'Pass', 'Incomplete');--> statement-breakpoint
ALTER TABLE "results_sb" ALTER COLUMN "status" SET DATA TYPE "public"."result_status_sb_enum" USING "status"::"public"."result_status_sb_enum";