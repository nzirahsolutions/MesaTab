import { pgTable, text, serial, pgEnum, uuid } from 'drizzle-orm/pg-core';
import { events } from './events';
import { relations } from 'drizzle-orm';

export const trackEnum= pgEnum('tabTrack',['Spelling Bee','Public Speaking','Chess','BP Debate','WSDC Debate']);

export const tabs = pgTable('tabs', {
  tab_id: serial('tab_id').primaryKey(),
  title: text('title').notNull(),
  track: trackEnum('track').notNull(),
  slug: text('slug').notNull().unique(),
  event_id: uuid('event_id').notNull().references(()=>events.event_id)
});

export const tabRelations= relations(tabs,({one})=>({
    events: one(events,{
        fields:[tabs.event_id],
        references:[events.event_id]
    }),
}));