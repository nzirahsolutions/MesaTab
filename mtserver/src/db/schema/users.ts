import { pgTable, text, uuid, timestamp } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  user_id: uuid('user_id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  password_hash:text('password_hash').notNull(),
  createdAt: timestamp('created_at',{mode:'string'}).defaultNow().notNull(),
});