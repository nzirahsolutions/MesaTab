DO $$
DECLARE
  column_type text;
BEGIN
  SELECT data_type
  INTO column_type
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND table_name = 'rounds_sb'
    AND column_name = 'cup_category_id';

  IF column_type IN ('text', 'character varying') THEN
    INSERT INTO "cup_categories_sb" ("tab_id", "cup_category", "order")
    SELECT DISTINCT r."tab_id", r."cup_category_id", 1
    FROM "rounds_sb" r
    WHERE r."cup_category_id" IS NOT NULL
      AND btrim(r."cup_category_id") <> ''
    ON CONFLICT ("tab_id", "cup_category") DO NOTHING;

    ALTER TABLE "rounds_sb" ADD COLUMN IF NOT EXISTS "cup_category_id_tmp" integer;

    UPDATE "rounds_sb" r
    SET "cup_category_id_tmp" = c."cup_category_id"
    FROM "cup_categories_sb" c
    WHERE r."tab_id" = c."tab_id"
      AND r."cup_category_id" = c."cup_category";

    IF EXISTS (
      SELECT 1
      FROM pg_constraint
      WHERE conname = 'rounds_sb_cup_category_id_cup_categories_sb_cup_category_id_fk'
    ) THEN
      ALTER TABLE "rounds_sb" DROP CONSTRAINT "rounds_sb_cup_category_id_cup_categories_sb_cup_category_id_fk";
    END IF;

    ALTER TABLE "rounds_sb" DROP COLUMN "cup_category_id";
    ALTER TABLE "rounds_sb" RENAME COLUMN "cup_category_id_tmp" TO "cup_category_id";
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'rounds_sb_cup_category_id_cup_categories_sb_cup_category_id_fk'
  ) THEN
    ALTER TABLE "rounds_sb"
      ADD CONSTRAINT "rounds_sb_cup_category_id_cup_categories_sb_cup_category_id_fk"
      FOREIGN KEY ("cup_category_id") REFERENCES "public"."cup_categories_sb"("cup_category_id")
      ON DELETE cascade ON UPDATE no action;
  END IF;
END $$;
