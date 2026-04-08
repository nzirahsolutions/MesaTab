import { index, pgTable, text, uuid, serial, integer, unique } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { tabsPS } from './tabsPS';

export const cupCategoriesPS = pgTable(
  'cup_categories_ps',
  {
    cupCategoryId: serial('cup_category_id').primaryKey(),
    tabId: uuid('tab_id').notNull().references(() => tabsPS.tabId, { onDelete: 'cascade' }),
    cupCategory: text('cup_category'),
    breakCapacity: integer('break_capacity').notNull().default(5),
    breakNumber: integer('break_number').notNull().default(1),
    cupOrder: integer('cup_order').notNull().default(1),
  },
  (c) => ({
    tabIdIdx: index('cups_ps_tabId_idx').on(c.tabId),
    cupTabUnique: unique().on(c.tabId, c.cupCategory),
    cupOrderUnique: unique().on(c.tabId, c.cupOrder),
  })
);

export const cupCategoriesPSRelations = relations(cupCategoriesPS, ({ one }) => ({
  tab: one(tabsPS, {
    fields: [cupCategoriesPS.tabId],
    references: [tabsPS.tabId],
  }),
}));
