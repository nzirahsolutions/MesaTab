import { index, pgTable, text, serial, uuid, unique, integer, pgEnum, boolean, foreignKey } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { tabsPS } from './tabsPS';
import { roundsPS } from './roundsPS';

export const speechTypePSEnum = pgEnum('speech_type_ps_enum', [
  'narrative',
  'dilemma',
  'philosophical',
  'informative',
  'inspirational',
  'impromptu',
  'selling',
  'special occassion',
  'creative',
  'other',
]);

export const speechPromptsPS = pgTable(
  'speech_prompts_ps',
  {
    promptId: serial('prompt_id').primaryKey(),
    tabId: uuid('tab_id').notNull().references(() => tabsPS.tabId, { onDelete: 'cascade' }),
    roundId: integer('round_id').notNull().references(() => roundsPS.roundId, { onDelete: 'cascade' }),
    speechPrompt: text('speech_prompt').notNull(),
    speechType: speechTypePSEnum('speech_type').notNull(),
    visible: boolean('visible').notNull().default(false),
  },
  (p) => ({
    roundPromptUnique: unique().on(p.roundId),
    tabRoundUnique: unique().on(p.tabId, p.roundId),
    tabPromptUnique: unique().on(p.tabId, p.speechPrompt),
    tabIdIdx: index('speech_prompts_ps_tabId_idx').on(p.tabId),
    roundIdIdx: index('speech_prompts_ps_roundId_idx').on(p.roundId),
    roundMustMatchTab: foreignKey({
      columns: [p.tabId, p.roundId],
      foreignColumns: [roundsPS.tabId, roundsPS.roundId],
      name: 'speech_prompts_ps_tab_round_fk',
    }).onDelete('cascade'),
  })
);

export const speechPromptsPSRelations = relations(speechPromptsPS, ({ one }) => ({
  tab: one(tabsPS, {
    fields: [speechPromptsPS.tabId],
    references: [tabsPS.tabId],
  }),
  round: one(roundsPS, {
    fields: [speechPromptsPS.roundId],
    references: [roundsPS.roundId],
  }),
}));
