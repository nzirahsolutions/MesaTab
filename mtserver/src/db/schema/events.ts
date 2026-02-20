import { pgTable, text, uuid } from 'drizzle-orm/pg-core';

export const events= pgTable('events',{
  event_id: uuid('event_id').primaryKey().defaultRandom(),
  title: text('title').notNull(),
  organizer: text('organizer').notNull(),
  slug: text('slug').notNull().unique(),
});