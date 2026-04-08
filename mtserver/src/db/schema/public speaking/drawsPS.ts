import { index, pgTable, serial, integer, uuid, unique, foreignKey } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { roomsPS } from './roomsPS';
import { roundsPS } from './roundsPS';
import { drawSpeakersPS } from './drawSpeakersPS';
import { drawJudgesPS } from './drawJudgesPS';
import { tabsPS } from './tabsPS';

export const drawsPS = pgTable(
  'draws_ps',
  {
    drawId: serial('draw_id').primaryKey(),
    tabId: uuid('tab_id').notNull().references(() => tabsPS.tabId, { onDelete: 'cascade' }),
    roomId: integer('room_id').notNull().references(() => roomsPS.roomId, { onDelete: 'cascade' }),
    roundId: integer('round_id').notNull().references(() => roundsPS.roundId, { onDelete: 'cascade' }),
  },
  (d) => ({
    tabIdIdx: index('draws_ps_tabId_idx').on(d.tabId),
    roomIdIdx: index('draws_ps_roomId_idx').on(d.roomId),
    roundIdIdx: index('draws_ps_roundId_idx').on(d.roundId),
    tabDrawUnique: unique().on(d.tabId, d.drawId),
    roomMustMatchTab: foreignKey({
      columns: [d.tabId, d.roomId],
      foreignColumns: [roomsPS.tabId, roomsPS.roomId],
      name: 'draws_ps_tab_room_fk',
    }).onDelete('cascade'),
    roundMustMatchTab: foreignKey({
      columns: [d.tabId, d.roundId],
      foreignColumns: [roundsPS.tabId, roundsPS.roundId],
      name: 'draws_ps_tab_round_fk',
    }).onDelete('cascade'),
  })
);

export const drawPSRelations = relations(drawsPS, ({ one, many }) => ({
  tab: one(tabsPS, {
    fields: [drawsPS.tabId],
    references: [tabsPS.tabId],
  }),
  room: one(roomsPS, {
    fields: [drawsPS.roomId],
    references: [roomsPS.roomId],
  }),
  round: one(roundsPS, {
    fields: [drawsPS.roundId],
    references: [roundsPS.roundId],
  }),
  speakers: many(drawSpeakersPS),
  judges: many(drawJudgesPS),
}));
