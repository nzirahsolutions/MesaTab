import { index, pgTable, text, pgEnum, uuid, serial, boolean, check, integer, unique} from 'drizzle-orm/pg-core';
import { tabsSB } from './tabsSB';
import { cupCategoriesSB } from './cupCategoriesSB';
import { drawsSB } from './drawsSB';
import { relations, sql } from 'drizzle-orm';

export const roundTypeSBEnum= pgEnum('round_type_sb',['Timed','Word Limit','Eliminator']);
export const breakPhaseSBEnum= pgEnum('break_phase_sb',['Octo-Finals','Quarter-Finals','Semi-Finals','Finals']);

export const roundsSB=pgTable('rounds_sb',{
    roundId: serial('round_id').primaryKey(),
    name: text('name').notNull(),
    number: integer('number').notNull(),
    breaks: boolean('breaks').notNull().default(false),
    cupCategoryId: integer('cup_category_id').references(() => cupCategoriesSB.cupCategoryId, { onDelete: 'cascade' }),
    breakPhase: breakPhaseSBEnum('break_phase'),
    tabId: uuid('tab_id').notNull().references(() => tabsSB.tabId, { onDelete: 'cascade' }),
    completed: boolean('completed').notNull().default(false),
    type: roundTypeSBEnum('type').notNull(),
    timeLimit:integer('time_limit'), //in seconds
    wordLimit:integer('word_limit'),
    blind: boolean('blind').notNull().default(false),
},
(r) => ({
    tabIdIdx: index('rounds_tabId_idx').on(r.tabId),
    tabNumberIdx: index('rounds_tab_number_idx').on(r.tabId, r.number),

    tabRoundUnique: unique().on(r.tabId, r.roundId),
    tabRoundNumberUnique: unique().on(r.tabId, r.number),

    // Exactly one valid shape by type
    typeLimitsCheck: check(
      'rounds_sb_type_limits_chk',
      sql`(
        (${r.type} = 'Timed' AND ${r.timeLimit} IS NOT NULL AND ${r.wordLimit} IS NULL) OR
        (${r.type} = 'Word Limit' AND ${r.wordLimit} IS NOT NULL AND ${r.timeLimit} IS NULL) OR
        (${r.type} = 'Eliminator' AND ${r.timeLimit} IS NULL AND ${r.wordLimit} IS NULL)
      )`
    ),
  })
);

export const roundsSBrelations=relations(roundsSB,({one, many})=>({
  tab: one(tabsSB,{
    fields: [roundsSB.tabId],
    references:[tabsSB.tabId],
  }),
  draws: many(drawsSB)
}))
