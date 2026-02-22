import { index, pgTable, text, serial, uuid, unique } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { tabsSB } from './tabsSB';

export const institutionsSB = pgTable(
  'institutions_sb',
  {
    institutionId: serial('institution_id').primaryKey(),
    tabId: uuid('tab_id').notNull().references(() => tabsSB.tabId, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    code: text('code').notNull(),
  },
  (i) => ({
    tabCodeUnique: unique().on(i.tabId, i.code),
    tabIdIdx: index('institutions_tabId_idx').on(i.tabId),
  })
);

export const institutionRelations = relations(institutionsSB, ({ one }) => ({
  tab: one(tabsSB, {
    fields: [institutionsSB.tabId],
    references: [tabsSB.tabId],
  }),
}));