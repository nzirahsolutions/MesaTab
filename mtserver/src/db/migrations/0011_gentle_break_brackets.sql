ALTER TYPE "round_type_sb" ADD VALUE IF NOT EXISTS 'Eliminator';
--> statement-breakpoint
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'rounds_sb'
      AND column_name = 'break_number'
  ) AND NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'rounds_sb'
      AND column_name = 'number'
  ) THEN
    ALTER TABLE "rounds_sb" RENAME COLUMN "break_number" TO "number";
  END IF;
END $$;
--> statement-breakpoint
ALTER TABLE "rounds_sb" ADD COLUMN IF NOT EXISTS "number" integer;
--> statement-breakpoint
UPDATE "rounds_sb" AS r
SET "number" = ordered.seq
FROM (
  SELECT "round_id", row_number() OVER (PARTITION BY "tab_id" ORDER BY COALESCE("number", 2147483647), "round_id") AS seq
  FROM "rounds_sb"
) AS ordered
WHERE r."round_id" = ordered."round_id";
--> statement-breakpoint
ALTER TABLE "rounds_sb" ALTER COLUMN "number" SET NOT NULL;
--> statement-breakpoint
ALTER TABLE "rounds_sb" ALTER COLUMN "number" DROP DEFAULT;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "rounds_tab_number_idx" ON "rounds_sb" USING btree ("tab_id", "number");
--> statement-breakpoint
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'rounds_sb_tab_id_number_unique'
  ) THEN
    ALTER TABLE "rounds_sb"
      ADD CONSTRAINT "rounds_sb_tab_id_number_unique" UNIQUE ("tab_id", "number");
  END IF;
END $$;
