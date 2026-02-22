import { index, pgTable, text, serial, uuid, unique } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { tabsSB } from './tabsSB';
import { drawsSB } from './drawsSB';

export const roomsSB = pgTable(
  'rooms_sb',
  {
    roomId: serial('room_id').primaryKey(),
    tabId: uuid('tab_id').notNull().references(() => tabsSB.tabId, { onDelete: 'cascade' }),
    name: text('name').notNull(),
  },
  (i) => ({
    tabnameUnique: unique().on(i.tabId, i.name),
    tabRoomUnique: unique().on(i.tabId, i.roomId),
    tabIdIdx: index('rooms_sb_tabId_idx').on(i.tabId),
  })
);

export const roomRelations = relations(roomsSB, ({ one, many }) => ({
  tab: one(tabsSB, {
    fields: [roomsSB.tabId],
    references: [tabsSB.tabId],
  }),
  draws: many(drawsSB)
}));