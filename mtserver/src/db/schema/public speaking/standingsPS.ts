import { pgTable, serial, integer, uuid, timestamp, text, unique, index, real } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { tabsPS } from './tabsPS';
import { speakersPS } from './speakersPS';

export const standingsPS = pgTable(
  'standings_ps',
  {
    standingId: serial('standing_id').primaryKey(),
    tabId: uuid('tab_id').notNull().references(() => tabsPS.tabId, { onDelete: 'cascade' }),
    speakerId: integer('speaker_id').notNull().references(() => speakersPS.speakerId, { onDelete: 'cascade' }),
    totalScore: integer('total_score').notNull().default(0),
    averageScore: real('average_score').notNull().default(0),
    appearances: integer('appearances').notNull().default(0),
    roundScores: text('round_scores'),
    rank: integer('rank'),
    updatedAt: timestamp('updated_at', { mode: 'string' }).defaultNow().$onUpdateFn(() => new Date().toISOString()).notNull(),
  },
  (s) => ({
    tabSpeakerUnique: unique().on(s.tabId, s.speakerId),
    tabIdIdx: index('standings_ps_tabId_idx').on(s.tabId),
    rankIdx: index('standings_ps_rank_idx').on(s.rank),
  })
);

export const standingsPSRelations = relations(standingsPS, ({ one }) => ({
  tab: one(tabsPS, {
    fields: [standingsPS.tabId],
    references: [tabsPS.tabId],
  }),
  speaker: one(speakersPS, {
    fields: [standingsPS.speakerId],
    references: [speakersPS.speakerId],
  }),
}));
