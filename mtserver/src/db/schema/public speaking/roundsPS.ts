import { index, pgTable, text, pgEnum, uuid, serial, boolean, check, integer, unique } from 'drizzle-orm/pg-core';
import { tabsPS } from './tabsPS';
import { cupCategoriesPS } from './cupCategoriesPS';
import { drawsPS } from './drawsPS';
import { relations, sql } from 'drizzle-orm';

export const breakPhasePSEnum = pgEnum('break_phase_ps', ['Triples', 'Doubles', 'Octos', 'Quarters', 'Semis', 'Finals']);

export const roundsPS = pgTable(
  'rounds_ps',
  {
    roundId: serial('round_id').primaryKey(),
    name: text('name').notNull(),
    number: integer('number').notNull(),
    breaks: boolean('breaks').notNull().default(false),
    cupCategoryId: integer('cup_category_id').references(() => cupCategoriesPS.cupCategoryId, { onDelete: 'cascade' }),
    breakPhase: breakPhasePSEnum('break_phase'),
    tabId: uuid('tab_id').notNull().references(() => tabsPS.tabId, { onDelete: 'cascade' }),
    completed: boolean('completed').notNull().default(false),
    speechDuration: integer('speech_duration').notNull(),
    blind: boolean('blind').notNull().default(false),
  },
  (r) => ({
    tabIdIdx: index('rounds_ps_tabId_idx').on(r.tabId),
    tabNumberIdx: index('rounds_ps_tab_number_idx').on(r.tabId, r.number),
    tabRoundUnique: unique().on(r.tabId, r.roundId),
    tabRoundNumberUnique: unique().on(r.tabId, r.cupCategoryId, r.number),
    tabCupBreakPhaseUnique: unique().on(r.tabId, r.breakPhase, r.cupCategoryId),
    speechDurationCheck: check('rounds_ps_duration_chk', sql`${r.speechDuration} > 0`),
  })
);

export const roundsPSRelations = relations(roundsPS, ({ one, many }) => ({
  tab: one(tabsPS, {
    fields: [roundsPS.tabId],
    references: [tabsPS.tabId],
  }),
  draws: many(drawsPS),
}));
