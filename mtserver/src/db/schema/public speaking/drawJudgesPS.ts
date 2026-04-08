import { pgTable, serial, integer, index, unique, uuid, foreignKey } from 'drizzle-orm/pg-core';
import { judgesPS } from './judgesPS';
import { drawsPS } from './drawsPS';
import { tabsPS } from './tabsPS';
import { roomsPS } from './roomsPS';
import { relations } from 'drizzle-orm';

export const drawJudgesPS = pgTable(
  'draw_judges_ps',
  {
    id: serial('id').primaryKey(),
    tabId: uuid('tab_id').notNull().references(() => tabsPS.tabId),
    judgeId: integer('judge_id').notNull().references(() => judgesPS.judgeId, { onDelete: 'cascade' }),
    drawId: integer('draw_id').notNull().references(() => drawsPS.drawId, { onDelete: 'cascade' }),
    roomId: integer('room_id').notNull().references(() => roomsPS.roomId, { onDelete: 'cascade' }),
  },
  (dj) => ({
    judgeUniquePerDraw: unique().on(dj.drawId, dj.judgeId),
    tabIdIdx: index('djp_tab_id_idx').on(dj.tabId),
    judgeIdIdx: index('djp_judge_id_idx').on(dj.judgeId),
    drawIdIdx: index('djp_draw_id_idx').on(dj.drawId),
    roomIdIdx: index('djp_room_id_idx').on(dj.roomId),
    judgeMustMatchTab: foreignKey({
      columns: [dj.tabId, dj.judgeId],
      foreignColumns: [judgesPS.tabId, judgesPS.judgeId],
      name: 'draw_judges_ps_tab_judge_fk',
    }).onDelete('cascade'),
    drawMustMatchTab: foreignKey({
      columns: [dj.tabId, dj.drawId],
      foreignColumns: [drawsPS.tabId, drawsPS.drawId],
      name: 'draw_judges_ps_tab_draw_fk',
    }).onDelete('cascade'),
  })
);

export const drawJudgesPSRelations = relations(drawJudgesPS, ({ one }) => ({
  tab: one(tabsPS, {
    fields: [drawJudgesPS.tabId],
    references: [tabsPS.tabId],
  }),
  judge: one(judgesPS, {
    fields: [drawJudgesPS.judgeId],
    references: [judgesPS.judgeId],
  }),
  draw: one(drawsPS, {
    fields: [drawJudgesPS.drawId],
    references: [drawsPS.drawId],
  }),
  room: one(roomsPS, {
    fields: [drawJudgesPS.roomId],
    references: [roomsPS.roomId],
  }),
}));
