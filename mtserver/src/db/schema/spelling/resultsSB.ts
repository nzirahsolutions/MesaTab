import { serial, integer, pgTable, pgEnum, timestamp } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { drawSpellers } from "./drawSpellers";

export const resultStatusSBEnum= pgEnum('result_status_sb_enum',['Eliminated','Won']);

export const resultsSB=pgTable('results_sb',{
    resultId: serial('result_id').primaryKey(),
    drawSpellerId: integer('draw_speller_id').notNull().unique().references(()=>drawSpellers.id,{onDelete:'cascade'}),
    score:integer(),
    status: resultStatusSBEnum(),    
    createdAt: timestamp('created_at', { mode: 'string' }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { mode: 'string' }).defaultNow().$onUpdateFn(() => new Date().toISOString()).notNull(),
});

export const resultsSbRelations=relations(resultsSB,({one})=>({
    drawSpeller: one(drawSpellers,{
        fields:[resultsSB.drawSpellerId],
        references:[drawSpellers.id]
    }),
}))