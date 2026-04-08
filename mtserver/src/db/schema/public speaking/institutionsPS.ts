import { index, pgTable, text, serial, uuid, unique } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { tabsPS } from './tabsPS';
import { judgesPS } from './judgesPS';
import { speakersPS } from './speakersPS';
import { tabMastersPS } from './tabMastersPS';

export const institutionsPS = pgTable(
  'institutions_ps',
  {
    institutionId: serial('institution_id').primaryKey(),
    tabId: uuid('tab_id').notNull().references(() => tabsPS.tabId, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    code: text('code').notNull(),
  },
  (i) => ({
    tabCodeUnique: unique().on(i.tabId, i.code),
    tabIdIdx: index('institutions_ps_tabId_idx').on(i.tabId),
  })
);

export const institutionPSRelations = relations(institutionsPS, ({ one, many }) => ({
  tab: one(tabsPS, {
    fields: [institutionsPS.tabId],
    references: [tabsPS.tabId],
  }),
  judges: many(judgesPS),
  speakers: many(speakersPS),
  tabMasters: many(tabMastersPS),
}));
