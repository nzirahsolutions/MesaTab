import { index, pgTable, boolean, text, serial, uuid, uniqueIndex, integer, unique } from 'drizzle-orm/pg-core';
import { relations, sql } from 'drizzle-orm';
import { tabsPS } from './tabsPS';
import { institutionsPS } from './institutionsPS';
import { drawJudgesPS } from './drawJudgesPS';

export const judgesPS = pgTable(
  'judges_ps',
  {
    judgeId: serial('judge_id').primaryKey(),
    tabId: uuid('tab_id').notNull().references(() => tabsPS.tabId, { onDelete: 'cascade' }),
    institutionId: integer('institution_id').notNull().references(() => institutionsPS.institutionId, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    email: text('email'),
    available: boolean('available').notNull().default(true),
  },
  (j) => ({
    tabIdIdx: index('judges_ps_tabId_idx').on(j.tabId),
    institutionIdIdx: index('judges_ps_institutionId_idx').on(j.institutionId),
    tabJudgeUnique: unique().on(j.tabId, j.judgeId),
    tabEmailUniqueWhenPresent: uniqueIndex('judges_ps_tab_email_uq')
      .on(j.tabId, j.email)
      .where(sql`${j.email} is not null`),
  })
);

export const judgesPSRelations = relations(judgesPS, ({ one, many }) => ({
  tab: one(tabsPS, {
    fields: [judgesPS.tabId],
    references: [tabsPS.tabId],
  }),
  institution: one(institutionsPS, {
    fields: [judgesPS.institutionId],
    references: [institutionsPS.institutionId],
  }),
  drawJudges: many(drawJudgesPS),
}));
