import { index, pgTable, text, serial, uuid, integer, unique } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { tabsPS } from './tabsPS';
import { institutionsPS } from './institutionsPS';

export const tabMastersPS = pgTable(
  'tab_masters_ps',
  {
    tabMasterId: serial('tab_master_id').primaryKey(),
    tabId: uuid('tab_id').notNull().references(() => tabsPS.tabId, { onDelete: 'cascade' }),
    institutionId: integer('institution_id').notNull().references(() => institutionsPS.institutionId, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    email: text('email').notNull(),
  },
  (t) => ({
    tabIdIdx: index('tab_masters_ps_tabId_idx').on(t.tabId),
    institutionIdIdx: index('tab_masters_ps_institutionId_idx').on(t.institutionId),
    tabTabMasterUnique: unique().on(t.tabId, t.tabMasterId),
    tabTabMasterEmailUnique: unique().on(t.tabId, t.email),
  })
);

export const tabMastersPSRelations = relations(tabMastersPS, ({ one }) => ({
  tab: one(tabsPS, {
    fields: [tabMastersPS.tabId],
    references: [tabsPS.tabId],
  }),
  institution: one(institutionsPS, {
    fields: [tabMastersPS.institutionId],
    references: [institutionsPS.institutionId],
  }),
}));
