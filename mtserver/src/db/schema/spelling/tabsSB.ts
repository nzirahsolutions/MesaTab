import { index, pgTable, text, uuid, unique } from 'drizzle-orm/pg-core';
import { events } from '../events';
import { institutionsSB } from './institutionsSB';
import { roomsSB } from './roomsSB';
import { spellers } from './spellers';
import { judgesSB } from './judgesSB';
import { tabMastersSB } from './tabMastersSB';
import { relations } from 'drizzle-orm';
import { roundsSB } from './roundsSB';
import { drawsSB } from './drawsSB';
import { drawSpellers } from './drawSpellers';
import { drawJudgesSB } from './drawJudgesSB';
import { resultsSB } from './resultsSB';

export const tabsSB = pgTable('tabs_sb', {
  tabId: uuid('tab_id').primaryKey().defaultRandom(),
  title: text('title').notNull(),
  slug: text('slug').notNull(),
  track:text('track').notNull().default('Spelling Bee'),
  eventId: uuid('event_id').notNull().references(()=>events.eventId, {onDelete:'cascade'}),
},
(t)=>({
    tabsb_slug_unique_per_event: unique().on(t.eventId, t.slug),
    eventIdIdx: index('tabs_sb_eventId_idx').on(t.eventId),
})
);

export const tabSBRelations= relations(tabsSB,({one, many})=>({
    event: one(events,{
        fields:[tabsSB.eventId],
        references:[events.eventId],
    }),
    institutions: many(institutionsSB),
    rooms: many(roomsSB),
    spellers: many(spellers),
    judges: many(judgesSB),
    tabMasters: many(tabMastersSB),
    rounds:many(roundsSB),
    draws: many(drawsSB),
    drawSpellers: many(drawSpellers),
    drawJudges: many(drawJudgesSB),
    results: many(resultsSB), 
}));