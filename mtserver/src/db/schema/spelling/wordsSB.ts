import { index, pgTable, text, serial, uuid, unique } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { tabsSB } from './tabsSB';

export const wordsSB = pgTable(
  'words_sb',
  {
    wordId: serial('word_id').primaryKey(),
    tabId: uuid('tab_id').notNull().references(() => tabsSB.tabId, { onDelete: 'cascade' }),
    word: text('word').notNull(),
  },
  (w) => ({
    tabWordUnique: unique().on(w.tabId, w.word),
    tabIdIdx: index('words_sb_tabId_idx').on(w.tabId),
  })
);

export const wordsSBRelations = relations(wordsSB, ({ one }) => ({
  tab: one(tabsSB, {
    fields: [wordsSB.tabId],
    references: [tabsSB.tabId],
  }),
}));
