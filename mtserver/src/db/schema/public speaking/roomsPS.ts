import { index, pgTable, text, serial, uuid, unique, boolean } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { tabsPS } from './tabsPS';
import { drawsPS } from './drawsPS';

export const roomsPS = pgTable(
  'rooms_ps',
  {
    roomId: serial('room_id').primaryKey(),
    tabId: uuid('tab_id').notNull().references(() => tabsPS.tabId, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    available: boolean('available').notNull().default(true),
  },
  (r) => ({
    tabNameUnique: unique().on(r.tabId, r.name),
    tabRoomUnique: unique().on(r.tabId, r.roomId),
    tabIdIdx: index('rooms_ps_tabId_idx').on(r.tabId),
  })
);

export const roomPSRelations = relations(roomsPS, ({ one, many }) => ({
  tab: one(tabsPS, {
    fields: [roomsPS.tabId],
    references: [tabsPS.tabId],
  }),
  draws: many(drawsPS),
}));
