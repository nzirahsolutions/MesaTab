import { pgTable, text, uuid, timestamp } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { events } from './events';

export const users = pgTable('users', {
  userId: uuid('user_id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  password_hash:text('password_hash').notNull(),
  createdAt: timestamp('created_at',{mode:'string'}).defaultNow().notNull(),
});

export const userRelations= relations(users,({many})=>({
    events: many(events),
}));