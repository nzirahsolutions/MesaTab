import { pgTable, serial, integer, uuid, timestamp, text, unique, index } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { tabsSB } from './tabsSB';
import { spellers } from './spellers';

export const standingsSB = pgTable(
  'standings_sb',
  {
    standingId: serial('standing_id').primaryKey(),
    tabId: uuid('tab_id').notNull().references(() => tabsSB.tabId, { onDelete: 'cascade' }),
    spellerId: integer('speller_id').notNull().references(() => spellers.spellerId, { onDelete: 'cascade' }),
    totalScore: integer('total_score').notNull().default(0),
    roundScores: text('round_scores'), // JSON array
    rank: integer('rank'),
    updatedAt: timestamp('updated_at', { mode: 'string' }).defaultNow().$onUpdateFn(() => new Date().toISOString()).notNull(),
  },
  (s) => ({
    tabSpellerUnique: unique().on(s.tabId, s.spellerId),
    tabIdIdx: index('standings_tabId_idx').on(s.tabId),
    rankIdx: index('standings_rank_idx').on(s.rank),
  })
);

export const standingsSBRelations = relations(standingsSB, ({ one }) => ({
  tab: one(tabsSB, {
    fields: [standingsSB.tabId],
    references: [tabsSB.tabId],
  }),
  speller: one(spellers, {
    fields: [standingsSB.spellerId],
    references: [spellers.spellerId],
  }),
}));
