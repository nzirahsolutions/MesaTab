ALTER TABLE "tab_masters_ps" DROP CONSTRAINT "tab_masters_ps_institution_id_institutions_ps_institution_id_fk";
--> statement-breakpoint
DROP INDEX "tab_masters_ps_institutionId_idx";--> statement-breakpoint
ALTER TABLE "tab_masters_ps" DROP COLUMN "institution_id";