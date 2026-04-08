import { pgTable, serial, integer, index, unique, uuid, foreignKey } from 'drizzle-orm/pg-core';
import { speakersPS } from './speakersPS';
import { drawsPS } from './drawsPS';
import { tabsPS } from './tabsPS';
import { roomsPS } from './roomsPS';
import { relations } from 'drizzle-orm';

export const drawSpeakersPS = pgTable(
  'draw_speakers_ps',
  {
    id: serial('id').primaryKey(),
    tabId: uuid('tab_id').notNull().references(() => tabsPS.tabId),
    speakerId: integer('speaker_id').notNull().references(() => speakersPS.speakerId, { onDelete: 'cascade' }),
    drawId: integer('draw_id').notNull().references(() => drawsPS.drawId, { onDelete: 'cascade' }),
    roomId: integer('room_id').notNull().references(() => roomsPS.roomId, { onDelete: 'cascade' }),
  },
  (ds) => ({
    speakerUniquePerDraw: unique().on(ds.drawId, ds.speakerId),
    tabIdIdx: index('dsp_tab_id_idx').on(ds.tabId),
    speakerIdIdx: index('dsp_speaker_id_idx').on(ds.speakerId),
    drawIdIdx: index('dsp_draw_id_idx').on(ds.drawId),
    roomIdIdx: index('dsp_room_id_idx').on(ds.roomId),
    speakerMustMatchTab: foreignKey({
      columns: [ds.tabId, ds.speakerId],
      foreignColumns: [speakersPS.tabId, speakersPS.speakerId],
      name: 'draw_speakers_ps_tab_speaker_fk',
    }).onDelete('cascade'),
    drawMustMatchTab: foreignKey({
      columns: [ds.tabId, ds.drawId],
      foreignColumns: [drawsPS.tabId, drawsPS.drawId],
      name: 'draw_speakers_ps_tab_draw_fk',
    }).onDelete('cascade'),
  })
);

export const drawSpeakersPSRelations = relations(drawSpeakersPS, ({ one }) => ({
  tab: one(tabsPS, {
    fields: [drawSpeakersPS.tabId],
    references: [tabsPS.tabId],
  }),
  speaker: one(speakersPS, {
    fields: [drawSpeakersPS.speakerId],
    references: [speakersPS.speakerId],
  }),
  draw: one(drawsPS, {
    fields: [drawSpeakersPS.drawId],
    references: [drawsPS.drawId],
  }),
  room: one(roomsPS, {
    fields: [drawSpeakersPS.roomId],
    references: [roomsPS.roomId],
  }),
}));
