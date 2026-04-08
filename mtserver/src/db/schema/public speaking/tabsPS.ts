import { index, pgTable, text, uuid, unique, integer, boolean, check } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { events } from '../events';
import { institutionsPS } from './institutionsPS';
import { roomsPS } from './roomsPS';
import { speakersPS } from './speakersPS';
import { judgesPS } from './judgesPS';
import { tabMastersPS } from './tabMastersPS';
import { roundsPS } from './roundsPS';
import { drawsPS } from './drawsPS';
import { drawSpeakersPS } from './drawSpeakersPS';
import { drawJudgesPS } from './drawJudgesPS';
import { cupCategoriesPS } from './cupCategoriesPS';
import { speechPromptsPS } from './speechPromptsPS';
import { sql } from 'drizzle-orm';

export const tabsPS = pgTable('tabs_ps', {
  tabId: uuid('tab_id').primaryKey().defaultRandom(),
  title: text('title').notNull(),
  slug: text('slug').notNull(),
  track:text('track').notNull().default('Public Speaking'),
  eventId: uuid('event_id').notNull().references(()=>events.eventId, {onDelete:'cascade'}),
  completed: boolean('completed').notNull().default(false),
  minScore: integer('min_score').notNull().default(30),
  maxScore: integer('max_score').notNull().default(90),
},
(t)=>({
    tab_slug_unique_per_event: unique().on(t.eventId, t.slug),
    eventIdIdx: index('tabs_ps_eventId_idx').on(t.eventId),
    scoreRangeValid: check('tabs_ps_score_range_chk', sql`${t.minScore} >= 0 AND ${t.maxScore} >= ${t.minScore}`),
})
);

export const tabPSRelations= relations(tabsPS,({one, many})=>({
    event: one(events,{
        fields:[tabsPS.eventId],
        references:[events.eventId],
    }),
    institutions: many(institutionsPS),
    rooms: many(roomsPS),
    speakers: many(speakersPS),
    judges: many(judgesPS),
    tabMasters: many(tabMastersPS),
    rounds: many(roundsPS),
    draws: many(drawsPS),
    drawSpeakers: many(drawSpeakersPS),
    drawJudges: many(drawJudgesPS),
    cups: many(cupCategoriesPS),
    speechPrompts: many(speechPromptsPS),
}));
