import { index, pgTable, text, serial, uuid, uniqueIndex, integer, unique } from 'drizzle-orm/pg-core';
import { relations} from 'drizzle-orm';
import { tabsSB } from './tabsSB';
import { institutionsSB } from './institutionsSB';

export const tabMastersSB = pgTable(
  'tab_masters_sb',
  {
    tabMasterId: serial('tab_master_id').primaryKey(),
    tabId: uuid('tab_id').notNull().references(() => tabsSB.tabId, { onDelete: 'cascade' }),
    institutionId: integer('institution_id').notNull().references(() => institutionsSB.institutionId, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    email: text('email').notNull(),
  },
  (t) => ({
    tabIdIdx: index('tab_masters_sb_tabId_idx').on(t.tabId),
    institutionIdIdx: index('tab_masters_sb_institutionId_idx').on(t.institutionId),

    tabTabMasterUnique: unique().on(t.tabId, t.tabMasterId),
    tabTabMasterEmailUnique: unique().on(t.tabId, t.email),
  })
);

export const tabMastersSBRelations = relations(tabMastersSB, ({ one}) => ({
  tab: one(tabsSB, {
    fields: [tabMastersSB.tabId],
    references: [tabsSB.tabId],
  }),
  institution: one(institutionsSB, {
    fields: [tabMastersSB.institutionId],
    references: [institutionsSB.institutionId],
  }),
}));