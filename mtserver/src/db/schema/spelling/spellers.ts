import { index, pgTable, text, serial, uuid, uniqueIndex, integer, unique } from 'drizzle-orm/pg-core';
import { relations, sql } from 'drizzle-orm';
import { tabsSB } from './tabsSB';
import { institutionsSB } from './institutionsSB';
import { drawSpellers } from './drawSpellers';

export const spellers = pgTable(
  'spellers',
  {
    spellerId: serial('speller_id').primaryKey(),
    tabId: uuid('tab_id').notNull().references(() => tabsSB.tabId, { onDelete: 'cascade' }),
    institutionId: integer('institution_id').notNull().references(() => institutionsSB.institutionId, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    email: text('email'),
  },
  (p) => ({
    tabIdIdx: index('spellers_tabId_idx').on(p.tabId),
    institutionIdIdx: index('spellers_institutionId_idx').on(p.institutionId),

    tabSpellerUnique: unique().on(p.tabId, p.spellerId),

    // optional: unique per tab when email exists
    tabEmailUniqueWhenPresent: uniqueIndex('spellers_tab_email_uq')
      .on(p.tabId, p.email)
      .where(sql`${p.email} is not null`),
  })
);

export const spellerRelations = relations(spellers, ({ one, many }) => ({
  tab: one(tabsSB, {
    fields: [spellers.tabId],
    references: [tabsSB.tabId],
  }),
  institution: one(institutionsSB, {
    fields: [spellers.institutionId],
    references: [institutionsSB.institutionId],
  }),
  spellingDraws: many(drawSpellers)
}));