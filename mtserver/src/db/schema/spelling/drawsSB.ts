import { index, pgTable,serial,integer, uuid, unique, foreignKey} from 'drizzle-orm/pg-core';
import { relations} from 'drizzle-orm';
import { roomsSB } from './roomsSB';
import { roundsSB } from './roundsSB';
import { drawSpellers } from './drawSpellers';
import { drawJudgesSB } from './drawJudgesSB';
import { tabsSB } from './tabsSB';

export const drawsSB=pgTable('draws_sb',{
    drawId:serial('draw_id').primaryKey(),
    tabId: uuid('tab_id').notNull().references(()=>tabsSB.tabId,{onDelete:'cascade'}),
    roomId: integer('room_id').notNull().references(()=>roomsSB.roomId,{onDelete:'cascade'}),
    roundId: integer('round_id').notNull().references(()=>roundsSB.roundId,{onDelete:'cascade'})
    },
    (d)=>({
    tabIdIdx: index('draws_tabId_idx').on(d.tabId),
    roomIdIdx: index('draws_roomId_idx').on(d.roomId),
    roundIdIdx: index('draws_roundId_idx').on(d.roundId),

    tabDrawUnique: unique().on(d.tabId, d.drawId),

    roomMustMatchTab: foreignKey({
        columns: [d.tabId, d.roomId],
        foreignColumns: [roomsSB.tabId, roomsSB.roomId],
        name: 'draws_tab_room_fk',
    }).onDelete('cascade'),

    roundMustMatchTab: foreignKey({
        columns: [d.tabId, d.roundId],
        foreignColumns: [roundsSB.tabId, roundsSB.roundId],
        name: 'draws_tab_round_fk',
    }).onDelete('cascade'),
})
);

export const drawRelations=relations(drawsSB,({one, many})=>({
    tab: one(tabsSB,{
        fields: [drawsSB.tabId],
        references: [tabsSB.tabId],
    }),
    room: one(roomsSB,{
        fields: [drawsSB.roomId],
        references: [roomsSB.roomId],
    }),
    round: one(roundsSB,{
        fields:[drawsSB.roundId],
        references:[roundsSB.roundId]
    }),
    spellers: many(drawSpellers),
    judges: many(drawJudgesSB),
}))