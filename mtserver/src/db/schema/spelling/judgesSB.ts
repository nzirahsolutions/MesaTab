import { index, pgTable, text, serial, uuid, uniqueIndex, integer, unique } from 'drizzle-orm/pg-core';
import { relations, sql } from 'drizzle-orm';
import { tabsSB } from './tabsSB';
import { institutionsSB } from './institutionsSB';
import { drawJudgesSB } from './drawJudgesSB';

export const judgesSB = pgTable(
  'judges_sb',
  {
    judgeId: serial('judge_id').primaryKey(),
    tabId: uuid('tab_id').notNull().references(() => tabsSB.tabId, { onDelete: 'cascade' }),
    institutionId: integer('institution_id').notNull().references(() => institutionsSB.institutionId, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    email: text('email'),
  },
  (j) => ({
    tabIdIdx: index('judges_sb_tabId_idx').on(j.tabId),
    institutionIdIdx: index('judges_sb_institutionId_idx').on(j.institutionId),

    tabJudgeUnique: unique().on(j.tabId, j.judgeId),

    // optional: unique per tab when email exists
    tabEmailUniqueWhenPresent: uniqueIndex('judges_sb_tab_email_uq')
      .on(j.tabId, j.email)
      .where(sql`${j.email} is not null`),
  })
);

export const judgesSBRelations = relations(judgesSB, ({ one, many }) => ({
  tab: one(tabsSB, {
    fields: [judgesSB.tabId],
    references: [tabsSB.tabId],
  }),
  institution: one(institutionsSB, {
    fields: [judgesSB.institutionId],
    references: [institutionsSB.institutionId],
  }),
  drawJudges: many(drawJudgesSB),
}));