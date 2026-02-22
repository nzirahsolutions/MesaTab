import { index, pgTable, text, pgEnum, uuid, serial, boolean, check, integer, unique} from 'drizzle-orm/pg-core';
import { tabsSB } from './tabsSB';
import { drawsSB } from './drawsSB';
import { relations, sql } from 'drizzle-orm';

export const roundTypeSBEnum= pgEnum('round_type_sb',['Timed','Word Limit','Eliminator']);

export const roundsSB=pgTable('rounds_sb',{
    roundId: serial('round_id').primaryKey(),
    name: text('name').notNull(),
    tabId: uuid('tab_id').notNull().references(() => tabsSB.tabId, { onDelete: 'cascade' }),
    completed: boolean('completed').notNull().default(false),
    breaks:boolean('breaks').notNull().default(false),
    type: roundTypeSBEnum('type').notNull(),
    timeLimit:integer('time_limit'), //in seconds
    wordLimit:integer('word_limit')
},
(r) => ({
    tabIdIdx: index('rounds_tabId_idx').on(r.tabId),

    tabRoundUnique: unique().on(r.tabId, r.roundId),

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