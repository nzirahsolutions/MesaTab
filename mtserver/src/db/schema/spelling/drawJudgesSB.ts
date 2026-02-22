import { pgTable,serial, integer, index, unique, uuid, foreignKey} from "drizzle-orm/pg-core";
import { judgesSB } from "./judgesSB";
import { drawsSB } from "./drawsSB";
import { tabsSB } from "./tabsSB";
import { relations } from "drizzle-orm";

export const drawJudgesSB=pgTable('draw_judges_sb',{
    id: serial('id').primaryKey(),
    tabId:uuid('tab_id').notNull().references(()=>tabsSB.tabId),
    judgeId: integer('judge_id').notNull().references(()=>judgesSB.judgeId,{onDelete:'cascade'}),
    drawId: integer('draw_id').notNull().references(()=>drawsSB.drawId,{onDelete:'cascade'}),
},
(ds)=>({
    judgeUniquePerDraw: unique().on(ds.drawId, ds.judgeId),

    tabIdIdx:index('dj_tab_id_idx').on(ds.tabId),
    judgeIdIdx:index('dj_judge_id_idx').on(ds.judgeId),
    drawIdIdx:index('dj_draw_id_idx').on(ds.drawId),

    judgeMustMatchTab: foreignKey({
        columns: [ds.tabId, ds.judgeId],
        foreignColumns: [judgesSB.tabId, judgesSB.judgeId],
        name: 'draw_judges_tab_judge_fk',
        }).onDelete('cascade'),

    drawMustMatchTab: foreignKey({
        columns: [ds.tabId, ds.drawId],
        foreignColumns: [drawsSB.tabId, drawsSB.drawId],
        name: 'draw_judges_tab_draw_fk',
        }).onDelete('cascade'),

}));

export const drawJudgesSBRelations=relations(drawJudgesSB,({one})=>({
    tab: one(tabsSB,{
        fields: [drawJudgesSB.tabId],
        references: [tabsSB.tabId],
    }),
    judge: one(judgesSB,{
        fields:[drawJudgesSB.judgeId],
        references: [judgesSB.judgeId]
    }),
    draw: one(drawsSB,{
        fields:[drawJudgesSB.drawId],
        references: [drawsSB.drawId]
    }),
}))