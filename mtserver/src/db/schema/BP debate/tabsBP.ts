import { index, pgTable, text, uuid, unique } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { events } from '../events';

export const tabsBP = pgTable('tabs_bp', {
  tabId: uuid('tab_id').primaryKey().defaultRandom(),
  title: text('title').notNull(),
  slug: text('slug').notNull(),
  eventId: uuid('event_id').notNull().references(()=>events.eventId, {onDelete:'cascade'}),
},
(t)=>({
    tab_slug_unique_per_event: unique().on(t.eventId, t.slug),
    eventIdIdx: index('tabs_bp_eventId_idx').on(t.eventId),
})
);

export const tabBPRelations= relations(tabsBP,({one})=>({
    event: one(events,{
        fields:[tabsBP.eventId],
        references:[events.eventId],
    }),
}));