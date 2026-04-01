import { index, pgTable, text, pgEnum, uuid, serial, boolean, check, integer, unique} from 'drizzle-orm/pg-core';
import { tabsSB } from './tabsSB';
import { relations, sql } from 'drizzle-orm';


export const cupCategoriesSB= pgTable('cup_categories_sb',{
    cupCategoryId: serial('cup_category_id').primaryKey(),
    tabId: uuid('tab_id').notNull().references(() => tabsSB.tabId, { onDelete: 'cascade' }),
    cupCategory: text('cup_category'),
    order: integer('order').notNull().default(1),
},
(r) => ({
    tabIdIdx: index('cups_tabId_idx').on(r.tabId),

    cupTabUnique: unique().on(r.tabId, r.cupCategory),
  }));

export const cupCategoriesSBrelations=relations(cupCategoriesSB,({one})=>({
  tab: one(tabsSB,{
    fields: [cupCategoriesSB.tabId],
    references:[tabsSB.tabId],
  }),
}))