import { pgTable, text, uuid, timestamp, index} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { tabsSB } from './spelling/tabsSB';
import { users } from './users';

export const events= pgTable('events',{
  eventId: uuid('event_id').primaryKey().defaultRandom(),
  title: text('title').notNull(),
  organizer: text('organizer').notNull(),
  slug: text('slug').notNull().unique(),
  ownerId: uuid('owner_id').notNull().references(()=>users.userId,{onDelete:'cascade'}),
  createdAt: timestamp('created_at',{mode:'string'}).defaultNow().notNull(),
},
(e)=>({
    ownerIdIdx: index('events_ownerId_idx').on(e.ownerId),
})
);

export const eventRelations= relations(events,({one,many})=>({
    user: one(users,{
        fields:[events.ownerId],
        references:[users.userId],
    }),
    tabsSB: many(tabsSB),
}));