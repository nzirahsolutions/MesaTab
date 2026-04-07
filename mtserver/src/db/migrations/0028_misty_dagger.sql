ALTER TABLE "tabs_sb" ADD COLUMN "prelim_number" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "tabs_sb" ADD COLUMN "completed" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "tabs_ps" ADD COLUMN "prelim_number" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "tabs_ps" ADD COLUMN "completed" boolean DEFAULT false NOT NULL;