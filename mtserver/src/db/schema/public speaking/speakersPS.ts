import { index, pgTable, text, boolean, serial, uuid, uniqueIndex, integer, unique } from 'drizzle-orm/pg-core';
import { relations, sql } from 'drizzle-orm';
import { tabsPS } from './tabsPS';
import { institutionsPS } from './institutionsPS';
import { drawSpeakersPS } from './drawSpeakersPS';

export const speakersPS = pgTable(
  'speakers_ps',
  {
    speakerId: serial('speaker_id').primaryKey(),
    tabId: uuid('tab_id').notNull().references(() => tabsPS.tabId, { onDelete: 'cascade' }),
    institutionId: integer('institution_id').notNull().references(() => institutionsPS.institutionId, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    email: text('email'),
    available: boolean('available').notNull().default(true),
  },
  (s) => ({
    tabIdIdx: index('speakers_ps_tabId_idx').on(s.tabId),
    institutionIdIdx: index('speakers_ps_institutionId_idx').on(s.institutionId),
    tabSpeakerUnique: unique().on(s.tabId, s.speakerId),
    tabEmailUniqueWhenPresent: uniqueIndex('speakers_ps_tab_email_uq')
      .on(s.tabId, s.email)
      .where(sql`${s.email} is not null`),
  })
);

export const speakerPSRelations = relations(speakersPS, ({ one, many }) => ({
  tab: one(tabsPS, {
    fields: [speakersPS.tabId],
    references: [tabsPS.tabId],
  }),
  institution: one(institutionsPS, {
    fields: [speakersPS.institutionId],
    references: [institutionsPS.institutionId],
  }),
  speakingDraws: many(drawSpeakersPS),
}));
