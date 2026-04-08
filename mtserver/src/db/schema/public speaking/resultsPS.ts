import { serial, integer, pgTable, pgEnum, timestamp } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { drawSpeakersPS } from './drawSpeakersPS';

export const resultStatusPSEnum = pgEnum('result_status_ps_enum', ['Eliminated', 'Pass', 'Incomplete']);

export const resultsPS = pgTable('results_ps', {
  resultId: serial('result_id').primaryKey(),
  drawSpeakerId: integer('draw_speaker_id').notNull().unique().references(() => drawSpeakersPS.id, { onDelete: 'cascade' }),
  score: integer('score').notNull(),
  status: resultStatusPSEnum('status'),
  createdAt: timestamp('created_at', { mode: 'string' }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { mode: 'string' }).defaultNow().$onUpdateFn(() => new Date().toISOString()).notNull(),
});

export const resultsPSRelations = relations(resultsPS, ({ one }) => ({
  drawSpeaker: one(drawSpeakersPS, {
    fields: [resultsPS.drawSpeakerId],
    references: [drawSpeakersPS.id],
  }),
}));
