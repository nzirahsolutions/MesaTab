import { pgTable,serial, integer, index, unique, uuid, foreignKey} from "drizzle-orm/pg-core";
import { spellers } from "./spellers";
import { drawsSB } from "./drawsSB";
import { tabsSB } from "./tabsSB";
import { relations } from "drizzle-orm";

export const drawSpellers=pgTable('draw_spellers',{
    id: serial('id').primaryKey(),
    tabId:uuid('tab_id').notNull().references(()=>tabsSB.tabId),
    spellerId: integer('speller_id').notNull().references(()=>spellers.spellerId,{onDelete:'cascade'}),
    drawId: integer('draw_id').notNull().references(()=>drawsSB.drawId,{onDelete:'cascade'}),
},
(ds)=>({
    spellerUniquePerDraw: unique().on(ds.drawId, ds.spellerId),

    tabIdIdx:index('ds_tab_id_idx').on(ds.tabId),
    spellerIdIdx:index('ds_speller_id_idx').on(ds.spellerId),
    drawIdIdx:index('ds_draw_id_idx').on(ds.drawId),

    spellerMustMatchTab: foreignKey({
        columns: [ds.tabId, ds.spellerId],
        foreignColumns: [spellers.tabId, spellers.spellerId],
        name: 'draw_spellers_tab_speller_fk',
        }).onDelete('cascade'),

    drawMustMatchTab: foreignKey({
        columns: [ds.tabId, ds.drawId],
        foreignColumns: [drawsSB.tabId, drawsSB.drawId],
        name: 'draw_spellers_tab_draw_fk',
        }).onDelete('cascade'),

}));

export const drawSpellersRelations=relations(drawSpellers,({one, many})=>({
    tab: one(tabsSB,{
        fields: [drawSpellers.tabId],
        references: [tabsSB.tabId],
    }),
    speller: one(spellers,{
        fields:[drawSpellers.spellerId],
        references: [spellers.spellerId]
    }),
    draw: one(drawsSB,{
        fields:[drawSpellers.drawId],
        references: [drawsSB.drawId]
    }),
}))