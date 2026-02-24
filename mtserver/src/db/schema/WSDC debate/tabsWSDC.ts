import { index, pgTable, text, uuid, unique } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { events } from '../events';

export const tabsWSDC = pgTable('tabs_wsdc', {
  tabId: uuid('tab_id').primaryKey().defaultRandom(),
  title: text('title').notNull(),
  slug: text('slug').notNull(),
  eventId: uuid('event_id').notNull().references(()=>events.eventId, {onDelete:'cascade'}),
},
(t)=>({
    tab_slug_unique_per_event: unique().on(t.eventId, t.slug),
    eventIdIdx: index('tabs_wsdc_eventId_idx').on(t.eventId),
})
);

export const tabWSDCRelations= relations(tabsWSDC,({one})=>({
    event: one(events,{
        fields:[tabsWSDC.eventId],
        references:[events.eventId],
    }),
}));