import { index, pgTable, text, uuid, unique } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { events } from '../events';

export const tabsPS = pgTable('tabs_ps', {
  tabId: uuid('tab_id').primaryKey().defaultRandom(),
  title: text('title').notNull(),
  slug: text('slug').notNull(),
  track:text('track').notNull().default('Public Speaking'),
  eventId: uuid('event_id').notNull().references(()=>events.eventId, {onDelete:'cascade'}),
},
(t)=>({
    tab_slug_unique_per_event: unique().on(t.eventId, t.slug),
    eventIdIdx: index('tabs_ps_eventId_idx').on(t.eventId),
})
);

export const tabPSRelations= relations(tabsPS,({one})=>({
    event: one(events,{
        fields:[tabsPS.eventId],
        references:[events.eventId],
    }),
}));