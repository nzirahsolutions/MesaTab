import { Request, Response } from "express";
import { and, asc, eq, inArray } from "drizzle-orm";
import { db } from "../../db/db";
import { cupCategoriesSB, resultsSB,drawsSB, drawJudgesSB, drawSpellers, roomsSB,spellers, judgesSB, roundsSB, standingsSB, tabsSB} from "../../db/schema";

function shuffle<T>(array: T[]): T[] {
  const arr = [...array]; // avoid mutating original
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function allocateSlidingPowerPair<T>(
  rooms: Array<{ roomId: number }>,
  rankedItems: T[]
): Array<{ roomId: number; allocatedBees: T[] }> {
  const basePerRoom = Math.floor(rankedItems.length / rooms.length);
  const extra = rankedItems.length % rooms.length;
  const capacities = rooms.map((_, i) => basePerRoom + (i < extra ? 1 : 0));
  const allocated = rooms.map((room) => ({ roomId: room.roomId, allocatedBees: [] as T[] }));

  let direction = 1;
  let roomIndex = 0;

  for (const item of rankedItems) {
    while (capacities[roomIndex] === 0) {
      if (direction === 1) {
        if (roomIndex === rooms.length - 1) {
          direction = -1;
        } else {
          roomIndex++;
        }
      } else if (roomIndex === 0) {
        direction = 1;
      } else {
        roomIndex--;
      }
    }

    allocated[roomIndex].allocatedBees.push(item);
    capacities[roomIndex]--;

    if (direction === 1) {
      if (roomIndex === rooms.length - 1) {
        direction = -1;
      } else {
        roomIndex++;
      }
    } else if (roomIndex === 0) {
      direction = 1;
    } else {
      roomIndex--;
    }
  }

  return allocated.filter((room) => room.allocatedBees.length > 0);
}

function allocateJudgesToRooms(
  judges: Array<{ judgeId: number; institutionId: number }>,
  roomAllocations: Array<{ roomId: number; allocatedBees: Array<{ institutionId: number }> }>
) {
  const availableJudges = shuffle(judges);
  const baseJudgesPerRoom = Math.floor(availableJudges.length / roomAllocations.length);
  const extraJudges = availableJudges.length % roomAllocations.length;

  let judgeCursor = 0;

  const judgeAllocations = roomAllocations.map((alloc, i) => {
    const size = baseJudgesPerRoom + (i < extraJudges ? 1 : 0);
    const spellerInst = new Set(alloc.allocatedBees.map((b) => b.institutionId));
    const chunk = availableJudges.slice(judgeCursor, judgeCursor + size);
    judgeCursor += size;

    const noConflict = chunk.filter((j) => !spellerInst.has(j.institutionId));
    const conflict = chunk.filter((j) => spellerInst.has(j.institutionId));

    return {
      roomId: alloc.roomId,
      judgeIds: [...noConflict, ...conflict].map((j) => j.judgeId),
    };
  });

  return new Map(judgeAllocations.map((j) => [j.roomId, j.judgeIds]));
}

function allocateJudgesAcrossRoundRooms(
  judges: Array<{ judgeId: number; institutionId: number }>,
  roundAllocations: Array<{
    roundId: number;
    roundName: string | null;
    roundNumber: number;
    roomAllocations: Array<{ roomId: number; allocatedBees: Array<{ institutionId: number }> }>;
  }>
) {
  const allRooms = roundAllocations.flatMap((round) =>
    round.roomAllocations.map((room) => ({
      roundId: round.roundId,
      roomId: room.roomId,
      allocatedBees: room.allocatedBees,
    }))
  );

  const judgeByRoom = allocateJudgesToRooms(judges, allRooms);

  return new Map(
    allRooms.map((room) => [`${room.roundId}:${room.roomId}`, judgeByRoom.get(room.roomId) ?? []] as const)
  );
}

async function replaceExistingDrawsForRound(
  tx: any,
  tabId: string,
  roundId: number
) {
  const existingDraws = await tx
    .select({ drawId: drawsSB.drawId })
    .from(drawsSB)
    .where(and(eq(drawsSB.tabId, tabId), eq(drawsSB.roundId, roundId)));

  const drawIds = existingDraws.map((d: { drawId: number }) => d.drawId);
  if (drawIds.length) {
    await tx.delete(drawSpellers).where(inArray(drawSpellers.drawId, drawIds));
    await tx.delete(drawJudgesSB).where(inArray(drawJudgesSB.drawId, drawIds));
    await tx.delete(drawsSB).where(inArray(drawsSB.drawId, drawIds));
  }
}

export async function generateDraw(req: Request, res: Response){
    console.log(req.body);
    try {
    const {roundId, tabId, powerPair}=req.body as{
        roundId?: number;
        tabId?: string;
        powerPair?: boolean;
    };
    const replaceExisting=true;
    if (!roundId || !tabId) 
        return res.status(400).json({message:'Tab Id and round required'});

    //confirm tab isn't completed
    const [tab]= await db
      .select({completed: tabsSB.completed})
      .from(tabsSB)
      .where(eq(tabsSB.tabId, tabId));
    
    if(tab.completed) return res.status(400).json({message:'Tab marked as completed'});
    //confirm round exists in tab
    const [round] = await db
      .select({
        roundId: roundsSB.roundId,
        tabId: roundsSB.tabId,
        name: roundsSB.name,
        breaks: roundsSB.breaks,
        completed: roundsSB.completed,
      })
      .from(roundsSB)
      .where(and(eq(roundsSB.tabId, tabId), eq(roundsSB.roundId, roundId)))
      .limit(1);
    if (!round) {
      return res.status(404).json({ message: "Round not found in this tab" });
    }

    //prevent redraw of completed rounds
    if(round.completed)
      return res.status(400).json({message: 'This round has been marked as completed on tab'});

    // Load required entities
    const [rooms, bees, judges] = await Promise.all([
      db
        .select({
          roomId: roomsSB.roomId,
          name: roomsSB.name,
        })
        .from(roomsSB)
        .where(and(eq(roomsSB.tabId, tabId),eq(roomsSB.available, true))),

      db
        .select({
          spellerId: spellers.spellerId,
          institutionId: spellers.institutionId,
        })
        .from(spellers)
        .where(and(eq(spellers.tabId, tabId),eq(spellers.available, true))),

      db
        .select({
          judgeId: judgesSB.judgeId,
          institutionId: judgesSB.institutionId,
        })
        .from(judgesSB)
        .where(and(eq(judgesSB.tabId, tabId),eq(judgesSB.available, true))),
    ]);

    if (!rooms.length) return res.status(400).json({ message: "No rooms found for this tab" });
    if (!bees.length) return res.status(400).json({ message: "No spellers available for this tab" });
    if (!judges.length) return res.status(400).json({ message: "No judges available in this tab" });

    let shuffledBees = shuffle(bees);
    if (powerPair) {
      console.log('powerPaired');
      const standings = await db
        .select({
          spellerId: standingsSB.spellerId,
          rank: standingsSB.rank,
        })
        .from(standingsSB)
        .where(eq(standingsSB.tabId, tabId))
        .orderBy(asc(standingsSB.rank), asc(standingsSB.spellerId));

      if (standings.length) {
        const beeById = new Map(bees.map((bee) => [bee.spellerId, bee] as const));
        const rankedBees: typeof bees = [];
        const rankedIds = new Set<number>();

        for (const standing of standings) {
          const bee = beeById.get(standing.spellerId);
          if (bee) {
            rankedBees.push(bee);
            rankedIds.add(bee.spellerId);
          }
        }

        for (const bee of bees) {
          if (!rankedIds.has(bee.spellerId)) rankedBees.push(bee);
        }

        shuffledBees = rankedBees;
      }
    }

    const roomAllocations = powerPair
      ? allocateSlidingPowerPair(rooms, shuffledBees)
      : (() => {
          const basePerRoom = Math.floor(shuffledBees.length / rooms.length);
          const extra = shuffledBees.length % rooms.length;

          let beeCursor = 0;
          return rooms
            .map((room, i) => {
              const size = basePerRoom + (i < extra ? 1 : 0);
              const allocatedBees = shuffledBees.slice(beeCursor, beeCursor + size);
              beeCursor += size;
              return { roomId: room.roomId, allocatedBees };
            })
            .filter((a) => a.allocatedBees.length > 0);
        })();

    if (!roomAllocations.length) {
      return res.status(400).json({ message: "Could not allocate any spellers to rooms" });
    }

    // if (judges.length < roomAllocations.length) {
    //   return res.status(400).json({
    //     message: `Not enough judges: need ${roomAllocations.length}, found ${judges.length}`,
    //   });
    // }

    const judgeByRoom = allocateJudgesToRooms(judges, roomAllocations);
    // console.log(judgeByRoom);

    const created = await db.transaction(async (tx) => {
      if (replaceExisting) {
        await replaceExistingDrawsForRound(tx, tabId, roundId);
      }

      const results: Array<{
        drawId: number;
        roomId: number;
        spellerIds: number[];
        judgeIds: number[];
      }> = [];

      for (const alloc of roomAllocations) {
        
        const [newDraw] = await tx
          .insert(drawsSB)
          .values({
            tabId,
            roundId,
            roomId: alloc.roomId,
          })
          .returning({
            drawId: drawsSB.drawId,
            roomId: drawsSB.roomId,
          });

        await tx.insert(drawSpellers).values(
          alloc.allocatedBees.map((b) => ({
            tabId,
            drawId: newDraw.drawId,
            roomId: alloc.roomId,
            spellerId: b.spellerId,
          }))
        );

        const roomJudgeIds = judgeByRoom.get(alloc.roomId) ?? [];
        if (roomJudgeIds.length) {
            await tx.insert(drawJudgesSB).values(
            roomJudgeIds.map((judgeId) => ({
                tabId,
                drawId: newDraw.drawId,
                roomId: alloc.roomId,
                judgeId,
            })));        
      }
      results.push({
          drawId: newDraw.drawId,
          roomId: alloc.roomId,
          spellerIds: alloc.allocatedBees.map((b) => b.spellerId),
          judgeIds: roomJudgeIds,
        });
    }
    // console.log(results);
    return results;
    });

    return res.status(201).json({
      message: "Draw generated successfully",
      data: {
        tabId,
        roundId,
        draws: created,
      },
    });


    } 
    catch (error){
        console.error("generateDraw error:", error);
        return res.status(500).json({ message: "failed to generate draw" });
    }
}
export async function updateDraw(req: Request, res: Response){
  try {
    const {roundId,room1, room2, swapState, judge1, judge2, speller1, speller2, tabId}=req.body as{
      roundId: number;
      room1: number;
      room2: number;
      swapState: number;
      judge1: number;
      judge2: number;
      speller1: number;
      speller2: number;
      tabId:string;
    }
    if(swapState!==5 && swapState!==6 && swapState!==7 && swapState!==8 && (!roundId || room1==0 || room2===0 || swapState===0 || !tabId))
        return res.status(400).json({message:'Must select rounds, rooms and update operation'});
    if(swapState!==5 && swapState!==6 && room1==room2)
        return res.status(400).json({message:'Select different rooms'});
    if(swapState===1 && (!speller1 || !speller2))
        return res.status(400).json({message:'Select two spellers to swap'});
    if(swapState===2 && (!judge1 || !judge2))
        return res.status(400).json({message:'Select two judges to swap'});
    if(swapState===3 && !speller1)
        return res.status(400).json({message:'Select speller to move'});
    if(swapState===4 && !judge1)
        return res.status(400).json({message:'Select judge to move'});
    if(swapState===5 && (!speller1 || room1==0))
        return res.status(400).json({message:`Select speller and room to add`});
    if(swapState===6 && (!judge1 || room1==0))
        return res.status(400).json({message:'Select judge and room to add'});
    if(swapState===7 && (room2==0 || room1==0))
        return res.status(400).json({message:'Select rooms to swap'});
    if(swapState===8 && (room2==0 || room1==0))
        return res.status(400).json({message:'Select rooms to move from and to'});

    //confirm tab isn't completed
    const [tab]= await db
      .select({completed: tabsSB.completed})
      .from(tabsSB)
      .where(eq(tabsSB.tabId, tabId));
    
    if(tab.completed) return res.status(400).json({message:'Tab marked as completed'});
    
    //confirm round exists in tab
    const [round] = await db
      .select({
        roundId: roundsSB.roundId,
        tabId: roundsSB.tabId,
        name: roundsSB.name,
        breaks: roundsSB.breaks,
        completed: roundsSB.completed,
      })
      .from(roundsSB)
      .where(and(eq(roundsSB.tabId, tabId), eq(roundsSB.roundId, roundId)))
      .limit(1);
    if (!round) {
      return res.status(404).json({ message: "Round not found in this tab" });
    }

    //prevent redraw of completed rounds
    if(round.completed)
      return res.status(400).json({message: 'This round has been marked as completed on tab'});

    //swap spellers
    if(swapState===1){
      const updated = await db.transaction(async (tx) => {
        const [draw1] = await tx
          .select({ drawId: drawsSB.drawId,  })
          .from(drawsSB)
          .where(and(
            eq(drawsSB.tabId, tabId), 
            eq(drawsSB.roundId, roundId), 
            eq(drawsSB.roomId, room1)))
          .limit(1);
        
        const [draw2] = await tx
          .select({ drawId: drawsSB.drawId })
          .from(drawsSB)
          .where(and(
            eq(drawsSB.tabId, tabId), 
            eq(drawsSB.roundId, roundId), 
            eq(drawsSB.roomId, room2)))
          .limit(1);

        if(!draw1 ||!draw2)
          throw new Error('Rooms had no draws in this round');

        //find spellers in drawspellers
        const [s1InDraw1] = await tx
          .select({ id: drawSpellers.id })
          .from(drawSpellers)
          .where(
            and(
              eq(drawSpellers.tabId, tabId),
              eq(drawSpellers.drawId, draw1.drawId),
              eq(drawSpellers.roomId, room1),
              eq(drawSpellers.spellerId, speller1)
            )
          )
          .limit(1);

        const [s2InDraw2] = await tx
          .select({ id: drawSpellers.id })
          .from(drawSpellers)
          .where(
            and(
              eq(drawSpellers.tabId, tabId),
              eq(drawSpellers.drawId, draw2.drawId),
              eq(drawSpellers.roomId, room2),
              eq(drawSpellers.spellerId, speller2)
            )
          )
          .limit(1);

        if (!s1InDraw1 || !s2InDraw2) {
          throw new Error("One or both spellers are not in the selected rooms");
        }
        
        // delete speller draws;
        await tx
          .delete(drawSpellers)
          .where(
            and(
              eq(drawSpellers.tabId, tabId),
              eq(drawSpellers.drawId, draw1.drawId),
              eq(drawSpellers.roomId, room1),
              eq(drawSpellers.spellerId, speller1)
            )
          );
        await tx
          .delete(drawSpellers)
          .where(
            and(
              eq(drawSpellers.tabId, tabId),
              eq(drawSpellers.drawId, draw2.drawId),
              eq(drawSpellers.roomId, room2),
              eq(drawSpellers.spellerId, speller2)
            )
          );

          //insert new speller draws
        await tx.insert(drawSpellers).values({
          tabId,
          drawId: draw1.drawId,
          roomId: room1,
          spellerId: speller2,
        });

        await tx.insert(drawSpellers).values({
          tabId,
          drawId: draw2.drawId,
          roomId: room2,
          spellerId: speller1,
        });

        return {
          roundId,
          room1,
          room2,
          speller1MovedTo: room2,
          speller2MovedTo: room1,
        };

      });
      return res.status(201).json({
      message: "Spellers swapped successfully",
      data: updated,
      });
    }
    //swap judges
    if(swapState===2){
      const updated = await db.transaction(async (tx) => {
        const [draw1] = await tx
          .select({ drawId: drawsSB.drawId,  })
          .from(drawsSB)
          .where(and(
            eq(drawsSB.tabId, tabId), 
            eq(drawsSB.roundId, roundId), 
            eq(drawsSB.roomId, room1)))
          .limit(1);
        
        const [draw2] = await tx
          .select({ drawId: drawsSB.drawId })
          .from(drawsSB)
          .where(and(
            eq(drawsSB.tabId, tabId), 
            eq(drawsSB.roundId, roundId), 
            eq(drawsSB.roomId, room2)))
          .limit(1);

        if(!draw1 ||!draw2)
          throw new Error('Rooms had no draws in this round');

        //find judges in drawspellers
        const [j1InDraw1] = await tx
          .select({ id: drawJudgesSB.id })
          .from(drawJudgesSB)
          .where(
            and(
              eq(drawJudgesSB.tabId, tabId),
              eq(drawJudgesSB.drawId, draw1.drawId),
              eq(drawJudgesSB.roomId, room1),
              eq(drawJudgesSB.judgeId, judge1)
            )
          )
          .limit(1);

        const [j2InDraw2] = await tx
          .select({ id: drawJudgesSB.id })
          .from(drawJudgesSB)
          .where(
            and(
              eq(drawJudgesSB.tabId, tabId),
              eq(drawJudgesSB.drawId, draw2.drawId),
              eq(drawJudgesSB.roomId, room2),
              eq(drawJudgesSB.judgeId, judge2)
            )
          )
          .limit(1);

        if (!j1InDraw1 || !j2InDraw2) {
          throw new Error("One or both judges are not in the selected rooms");
        }
        
        // delete judge draws;
        await tx
          .delete(drawJudgesSB)
          .where(
            and(
              eq(drawJudgesSB.tabId, tabId),
              eq(drawJudgesSB.drawId, draw1.drawId),
              eq(drawJudgesSB.roomId, room1),
              eq(drawJudgesSB.judgeId, judge1)
            )
          );
        await tx
          .delete(drawJudgesSB)
          .where(
            and(
              eq(drawJudgesSB.tabId, tabId),
              eq(drawJudgesSB.drawId, draw2.drawId),
              eq(drawJudgesSB.roomId, room2),
              eq(drawJudgesSB.judgeId, judge2)
            )
          );

          //insert new judge draws
        await tx.insert(drawJudgesSB).values({
          tabId,
          drawId: draw1.drawId,
          roomId: room1,
          judgeId: judge2,
        });

        await tx.insert(drawJudgesSB).values({
          tabId,
          drawId: draw2.drawId,
          roomId: room2,
          judgeId: judge1,
        });

        return {
          roundId,
          room1,
          room2,
          judge1MovedTo: room2,
          judge2MovedTo: room1,
        };

      });
      return res.status(201).json({
      message: "Judges swapped successfully",
      data: updated,
      });
    }
    
    //move speller
    if(swapState===3){
      const updated = await db.transaction(async (tx) => {
        const [draw1] = await tx
          .select({ drawId: drawsSB.drawId,  })
          .from(drawsSB)
          .where(and(
            eq(drawsSB.tabId, tabId), 
            eq(drawsSB.roundId, roundId), 
            eq(drawsSB.roomId, room1)))
          .limit(1);
        
        const [draw2] = await tx
          .select({ drawId: drawsSB.drawId })
          .from(drawsSB)
          .where(and(
            eq(drawsSB.tabId, tabId), 
            eq(drawsSB.roundId, roundId), 
            eq(drawsSB.roomId, room2)))
          .limit(1);

        if(!draw1 ||!draw2)
          throw new Error('Rooms had no draws in this round');

        //find spellers in drawspellers
        const [s1InDraw1] = await tx
          .select({ id: drawSpellers.id })
          .from(drawSpellers)
          .where(
            and(
              eq(drawSpellers.tabId, tabId),
              eq(drawSpellers.drawId, draw1.drawId),
              eq(drawSpellers.roomId, room1),
              eq(drawSpellers.spellerId, speller1)
            )
          )
          .limit(1);

        if (!s1InDraw1) {
          throw new Error("Speller is not in the selected rooms");
        }
        
        // delete speller draw;
        await tx
          .delete(drawSpellers)
          .where(
            and(
              eq(drawSpellers.tabId, tabId),
              eq(drawSpellers.drawId, draw1.drawId),
              eq(drawSpellers.roomId, room1),
              eq(drawSpellers.spellerId, speller1)
            )
          );

          //insert new speller draw
        await tx.insert(drawSpellers).values({
          tabId,
          drawId: draw2.drawId,
          roomId: room2,
          spellerId: speller1,
        });

        return {
          roundId,
          room1,
          room2,
          speller1MovedTo: room2,
        };

      });
      return res.status(201).json({
      message: "Speller moved successfully",
      data: updated,
      });
    }

    //move judge
    if(swapState===4){
      const updated = await db.transaction(async (tx) => {
        const [draw1] = await tx
          .select({ drawId: drawsSB.drawId,  })
          .from(drawsSB)
          .where(and(
            eq(drawsSB.tabId, tabId), 
            eq(drawsSB.roundId, roundId), 
            eq(drawsSB.roomId, room1)))
          .limit(1);
        
        const [draw2] = await tx
          .select({ drawId: drawsSB.drawId })
          .from(drawsSB)
          .where(and(
            eq(drawsSB.tabId, tabId), 
            eq(drawsSB.roundId, roundId), 
            eq(drawsSB.roomId, room2)))
          .limit(1);

        if(!draw1 ||!draw2)
          throw new Error('Rooms had no draws in this round');

        //find judge in drawJudges
        const [j1InDraw1] = await tx
          .select({ id: drawJudgesSB.id })
          .from(drawJudgesSB)
          .where(
            and(
              eq(drawJudgesSB.tabId, tabId),
              eq(drawJudgesSB.drawId, draw1.drawId),
              eq(drawJudgesSB.roomId, room1),
              eq(drawJudgesSB.judgeId, judge1)
            )
          )
          .limit(1);

        if (!j1InDraw1) {
          throw new Error("Judge is not in the selected rooms");
        }
        
        // delete judge draw;
        await tx
          .delete(drawJudgesSB)
          .where(
            and(
              eq(drawJudgesSB.tabId, tabId),
              eq(drawJudgesSB.drawId, draw1.drawId),
              eq(drawJudgesSB.roomId, room1),
              eq(drawJudgesSB.judgeId, judge1)
            )
          );

          //insert new judge draw
        await tx.insert(drawJudgesSB).values({
          tabId,
          drawId: draw2.drawId,
          roomId: room2,
          judgeId: judge1,
        });

        return {
          roundId,
          room1,
          room2,
          judge1MovedTo: room2,
        };

      });
      return res.status(200).json({
      message: "Judge moved successfully",
      data: updated,
      });
    }

    //add speller
    if(swapState===5){
      const updated=await db.transaction(async (tx)=>{
        //check if room had a draw in this round
        const [draw1] = await tx
          .select({ drawId: drawsSB.drawId,  })
          .from(drawsSB)
          .where(and(
            eq(drawsSB.tabId, tabId), 
            eq(drawsSB.roundId, roundId), 
            eq(drawsSB.roomId, room1)))
          .limit(1);

        if(!draw1)
          throw new Error('Room had no draw in this round');

        //check if speller already in draw
        const [spellerInDraw] = await tx
          .select({ id: drawSpellers.id })
          .from(drawSpellers)
          .where(
            and(
              eq(drawSpellers.tabId, tabId),
              eq(drawSpellers.drawId, draw1.drawId),
              eq(drawSpellers.spellerId, speller1)
            )
          )
          .limit(1);

        if (spellerInDraw) {
          throw new Error("Speller already in draw for this round");
        }

        //add new speller draw
        await tx.insert(drawSpellers).values({
          tabId,
          drawId: draw1.drawId,
          roomId: room1,
          spellerId: speller1,
        });

        return {
          roundId,
          room1,
          speller1,
          speller1AddedTo: room1,
        };
      });

      return res.status(200).json({
      message: "Speller added successfully",
      data: updated,
      });
    }
    //add judge
    if(swapState===6){
      const updated=await db.transaction(async (tx)=>{
        //check if room had a draw in this round
        const [draw1] = await tx
          .select({ drawId: drawsSB.drawId,  })
          .from(drawsSB)
          .where(and(
            eq(drawsSB.tabId, tabId), 
            eq(drawsSB.roundId, roundId), 
            eq(drawsSB.roomId, room1)))
          .limit(1);

        if(!draw1)
          throw new Error('Room had no draw in this round');

        //check if judge already in draw
        const [judgeInDraw] = await tx
          .select({ id: drawJudgesSB.id })
          .from(drawJudgesSB)
          .where(
            and(
              eq(drawJudgesSB.tabId, tabId),
              eq(drawJudgesSB.drawId, draw1.drawId),
              eq(drawJudgesSB.judgeId, judge1)
            )
          )
          .limit(1);

        if (judgeInDraw) {
          throw new Error("Judge already in draw for this round");
        }

        //add new judge draw
        await tx.insert(drawJudgesSB).values({
          tabId,
          drawId: draw1.drawId,
          roomId: room1,
          judgeId: judge1,
        });

        return {
          roundId,
          room1,
          judge1,
          judgeAddedTo: room1,
        };
      });

      return res.status(200).json({
      message: "Judge added successfully",
      data: updated,
      });
    }
    //swap rooms
    if(swapState===7){
      const updated = await db.transaction(async (tx) => {
        const [draw1] = await tx
          .select({ drawId: drawsSB.drawId,  })
          .from(drawsSB)
          .where(and(
            eq(drawsSB.tabId, tabId), 
            eq(drawsSB.roundId, roundId), 
            eq(drawsSB.roomId, room1)))
          .limit(1);
        
        const [draw2] = await tx
          .select({ drawId: drawsSB.drawId })
          .from(drawsSB)
          .where(and(
            eq(drawsSB.tabId, tabId), 
            eq(drawsSB.roundId, roundId), 
            eq(drawsSB.roomId, room2)))
          .limit(1);

        if(!draw1 ||!draw2)
          throw new Error('One or both rooms had no draws in this round');

        //update draws
        const [newDraw1]=await tx
          .update(drawsSB)
          .set({roomId: room2})
          .where(and(eq(drawsSB.drawId, draw1.drawId), eq(drawsSB.roomId, room1)))
          .returning({
            drawId: drawsSB.drawId,
            roomId: drawsSB.roomId,
            roundId: drawsSB.roundId
          });
        const [newDraw2]=await tx
          .update(drawsSB)
          .set({roomId: room1})
          .where(and(eq(drawsSB.drawId, draw2.drawId), eq(drawsSB.roomId, room2)))
          .returning({
            drawId: drawsSB.drawId,
            roomId: drawsSB.roomId,
            roundId: drawsSB.roundId
          });
        if(!newDraw1 || !newDraw2) throw new Error('Error updating draws table');

        const newDrawSpellers1=await tx
          .update(drawSpellers)
          .set({roomId: newDraw1.roomId})
          .where(eq(drawSpellers.drawId, draw1.drawId))
          .returning({
            drawId: drawSpellers.drawId,
            roomId: drawSpellers.roomId,
          });
        const newDrawSpellers2=await tx
          .update(drawSpellers)
          .set({roomId: newDraw2.roomId})
          .where(eq(drawSpellers.drawId, draw2.drawId))
          .returning({
            drawId: drawSpellers.drawId,
            roomId: drawSpellers.roomId,
          });
        if(!newDrawSpellers1.length || !newDrawSpellers2.length) throw new Error('Error updating speller draws table');

        const newDrawJudges1=await tx
          .update(drawJudgesSB)
          .set({roomId: newDraw1.roomId})
          .where(eq(drawJudgesSB.drawId, draw1.drawId))
          .returning({
            drawId: drawJudgesSB.drawId,
            roomId: drawJudgesSB.roomId,
          });
        const newDrawJudges2=await tx
          .update(drawJudgesSB)
          .set({roomId: newDraw2.roomId})
          .where(eq(drawJudgesSB.drawId, draw2.drawId))
          .returning({
            drawId: drawJudgesSB.drawId,
            roomId: drawJudgesSB.roomId,
          });
        if(!newDrawJudges1.length || !newDrawJudges2.length) throw new Error('Error updating judge draws table');

        return {
          roundId,
          newRoom1: newDraw2,
          newRoom2: newDraw1
        };

      });
      return res.status(201).json({
      message: "Rooms swapped successfully",
      data: updated,
      });
    }
    if(swapState===8){
      const updated=await db.transaction(async (tx)=>{
        //confirm round exists        
        const [currentRound] = await tx
          .select({ roundId: roundsSB.roundId, number: roundsSB.number })
          .from(roundsSB)
          .where(and(eq(roundsSB.tabId, tabId), eq(roundsSB.roundId, roundId)))
          .limit(1);
        if (!currentRound) throw new Error("Round not found");

        //check if room had a draw in this round
        const [draw1] = await tx
          .select({ drawId: drawsSB.drawId,  })
          .from(drawsSB)
          .where(and(
            eq(drawsSB.tabId, tabId), 
            eq(drawsSB.roundId, roundId), 
            eq(drawsSB.roomId, room1)))
          .limit(1);

        if(!draw1)
          throw new Error('Selected Room had no draw in this round');

        //check if new Room had a draw in this round
        const [draw2] = await tx
          .select({ drawId: drawsSB.drawId,  })
          .from(drawsSB)
          .where(and(
            eq(drawsSB.tabId, tabId), 
            eq(drawsSB.roundId, roundId), 
            eq(drawsSB.roomId, room2)))
          .limit(1);

        if(draw2)
          throw new Error('"Move to" room is occupied in this cup');

        //check if another round in a different cup has occupied the room
        const siblingRounds = await tx
          .select({ roundId: roundsSB.roundId })
          .from(roundsSB)
          .where(and(eq(roundsSB.tabId, tabId), eq(roundsSB.number, currentRound.number)));

        const siblingRoundIds = siblingRounds.map((r) => r.roundId);

        const occupiedTarget = await tx
          .select({ drawId: drawsSB.drawId, roundId: drawsSB.roundId })
          .from(drawsSB)
          .where(
            and(
              eq(drawsSB.tabId, tabId),
              eq(drawsSB.roomId, room2),
              inArray(drawsSB.roundId, siblingRoundIds)
            )
          )
          .limit(1);

        if (occupiedTarget.length) {
          throw new Error('Target room is occupied by another round in this time slot');
        }

        
        //update draw tables
        const [newDraw1]=await tx
          .update(drawsSB)
          .set({roomId: room2})
          .where(and(eq(drawsSB.drawId, draw1.drawId), eq(drawsSB.roomId, room1)))
          .returning({
            drawId: drawsSB.drawId,
            roomId: drawsSB.roomId,
            roundId: drawsSB.roundId
          });
        if(!newDraw1) throw new Error('Error updating draws table');

        const newDrawSpellers1=await tx
          .update(drawSpellers)
          .set({roomId: newDraw1.roomId})
          .where(eq(drawSpellers.drawId, draw1.drawId))
          .returning({
            drawId: drawSpellers.drawId,
            roomId: drawSpellers.roomId,
          });
        if(!newDrawSpellers1.length) throw new Error('Error updating speller draws table');

        const newDrawJudges1=await tx
          .update(drawJudgesSB)
          .set({roomId: newDraw1.roomId})
          .where(eq(drawJudgesSB.drawId, draw1.drawId))
          .returning({
            drawId: drawJudgesSB.drawId,
            roomId: drawJudgesSB.roomId,
          });
        if(!newDrawJudges1.length) throw new Error('Error updating judge draws table');

        return {
          roundId,
          newRoom1: newDraw1,
        };
      });

      return res.status(200).json({
      message: "Room moved successfully",
      data: updated,
      });
    }

    return res.status(400).json({message: 'Unsupported update operation (swapState)'});
  } 
    catch (error){
      const msg = error instanceof Error ? error.message : "failed to update draw";
      return res.status(500).json({ message: msg });
    }
}
export async function deleteDraw(req: Request, res: Response){
  console.log('called');
  try {
    const {roundId, tabId}=req.body as{
      roundId: number;
      tabId: string;
    }
    if(!roundId || roundId===0 || !tabId) return res.status(400).json({message:'Please select a round'});

    //confirm tab isn't completed
    const [tab]= await db
      .select({completed: tabsSB.completed})
      .from(tabsSB)
      .where(eq(tabsSB.tabId, tabId));
    
    if(tab.completed) return res.status(400).json({message:'Tab marked as completed'});

    //confirm round exists in tab
    const [round] = await db
      .select({
        roundId: roundsSB.roundId,
        tabId: roundsSB.tabId,
        name: roundsSB.name,
        breaks: roundsSB.breaks,
        completed: roundsSB.completed,
      })
      .from(roundsSB)
      .where(and(eq(roundsSB.tabId, tabId), eq(roundsSB.roundId, roundId)))
      .limit(1);
    if (!round) {
      return res.status(404).json({ message: "Round not found in this tab" });
    }
    if (round.completed) {
      return res.status(400).json({ message: "Cannot delete draw for a completed round" });
    }
    //find draws
    const existing= await db
        .select({
          drawId: drawsSB.drawId,
          tabId: drawsSB.tabId,
          roomId: drawsSB.roomId,
          roundId: drawsSB.roundId,
        })
        .from(drawsSB)
        .where(and(eq(drawsSB.tabId, tabId),eq(drawsSB.roundId, roundId)));
    if (!existing.length) {
      return res.status(404).json({ message: "No draw for this round in tab" });
    }
    const drawIds=existing.map((e)=>e.drawId);
    if(drawIds.length) await db.delete(drawsSB).where(inArray(drawsSB.drawId, drawIds));

    return res.status(200).json({
      message: "Draw deleted successfully",
    });

  } 
  catch (error){
    console.error("deleteDraw error:", error);
    return res.status(500).json({ message: "failed to delete draw" });
  }
}

//breaks
const breakPhaseOrder = ["Triples", "Doubles", "Octos", "Quarters", "Semis", "Finals"] as const;
type BreakPhase = (typeof breakPhaseOrder)[number];

type BreakCup = {
  id: number;
  cupCategory: string | null;
  cupOrder: number;
  breakNumber: number;
  breakCapacity: number;
};

type RankedSpeller = {
  spellerId: number;
  institutionId: number;
  rank: number | null;
  name: string;
};

type RoomRow = {
  roomId: number;
  name: string;
};

type BreakRoundRow = {
  roundId: number;
  name: string;
  number: number;
  breakPhase: BreakPhase | null;
  cupCategoryId: number | null;
  completed: boolean;
};

type BreakAllocation = {
  roomId: number;
  roomName: string;
  spellers: RankedSpeller[];
};

type BreakCupPlan = {
  cupId: number;
  cupCategory: string | null;
  cupOrder: number;
  breakNumber: number;
  breakCapacity: number;
  trueBreakCapacity: number;
  requestedRooms: number;
  assignedRooms: number;
  qualifiersFound: number;
  warnings: string[];
  allocations: BreakAllocation[];
};

function chunkIntoRooms<T>(items: T[], roomCount: number, roomCapacity: number) {
  const chunks: T[][] = [];
  let cursor = 0;

  for (let i = 0; i < roomCount; i++) {
    const chunk = items.slice(cursor, cursor + roomCapacity);
    if (!chunk.length) break;
    chunks.push(chunk);
    cursor += roomCapacity;
  }

  return chunks;
}

function buildBreakPlan(params: {
  cups: BreakCup[];
  standings: RankedSpeller[];
  rooms: RoomRow[];
}) {
  const { cups, standings, rooms } = params;

  const errors: string[] = [];
  const warnings: string[] = [];

  const sortedCups = [...cups].sort((a, b) => a.cupOrder - b.cupOrder || a.id - b.id);
  const rankedSpellers = standings
    .filter((s) => s.rank !== null)
    .sort((a, b) => (a.rank! - b.rank!) || (a.spellerId - b.spellerId));

  if (!sortedCups.length) errors.push("No cups configured");
  if (!rankedSpellers.length) errors.push("No ranked spellers available");
  if (!rooms.length) errors.push("No rooms available");

  if (errors.length) {
    return {
      ok: false,
      errors,
      warnings,
      summary: {
        totalCups: sortedCups.length,
        totalRankedSpellers: rankedSpellers.length,
        totalRooms: rooms.length,
      },
      cups: [] as BreakCupPlan[],
    };
  }

  let spellerCursor = 0;
  let roomCursor = 0;

  const cupPlans: BreakCupPlan[] = sortedCups.map((cup) => {
    const cupWarnings: string[] = [];
    const requestedRooms = cup.breakNumber;
    const roomCapacity = cup.breakCapacity;
    const trueBreakCapacity = requestedRooms * roomCapacity;

    const qualifiers = rankedSpellers.slice(spellerCursor, spellerCursor + trueBreakCapacity);
    spellerCursor += qualifiers.length;

    const remainingRooms = rooms.length - roomCursor;
    const assignedRooms = Math.min(requestedRooms, remainingRooms);
    const selectedRooms = rooms.slice(roomCursor, roomCursor + assignedRooms);
    roomCursor += assignedRooms;

    if (assignedRooms < requestedRooms) {
      cupWarnings.push(`${cup.cupCategory}: requested ${requestedRooms} rooms, found ${assignedRooms}`);
    }

    if (qualifiers.length < trueBreakCapacity) {
      cupWarnings.push(`${cup.cupCategory}: expected ${trueBreakCapacity} spellers, found ${qualifiers.length}`);
    }

    const usableQualifierCount = Math.min(qualifiers.length, assignedRooms * roomCapacity);
    const usableQualifiers = qualifiers.slice(0, usableQualifierCount);
    const allocations = allocateSlidingPowerPair(
      selectedRooms.map((room) => ({ roomId: room.roomId })),
      usableQualifiers
    ).map((allocation) => ({
      roomId: allocation.roomId,
      roomName: selectedRooms.find((room) => room.roomId === allocation.roomId)?.name ?? `Room ${allocation.roomId}`,
      spellers: allocation.allocatedBees,
    }));

    warnings.push(...cupWarnings);

    return {
      cupId: cup.id,
      cupCategory: cup.cupCategory,
      cupOrder: cup.cupOrder,
      breakNumber: cup.breakNumber,
      breakCapacity: cup.breakCapacity,
      trueBreakCapacity,
      requestedRooms,
      assignedRooms,
      qualifiersFound: qualifiers.length,
      warnings: cupWarnings,
      allocations,
    };
  });

  return {
    ok: true,
    errors,
    warnings,
    summary: {
      totalCups: sortedCups.length,
      totalRankedSpellers: rankedSpellers.length,
      totalRooms: rooms.length,
      roomsUsed: roomCursor,
      roomsRemaining: rooms.length - roomCursor,
    },
    cups: cupPlans,
  };
}

function groupBreakRoundsByCup(rounds: BreakRoundRow[]) {
  const grouped = new Map<number, BreakRoundRow[]>();
  for (const round of rounds) {
    if (!round.cupCategoryId) continue;
    const list = grouped.get(round.cupCategoryId) ?? [];
    list.push(round);
    grouped.set(round.cupCategoryId, list);
  }
  for (const list of grouped.values()) {
    list.sort((a, b) => a.number - b.number || a.roundId - b.roundId);
  }
  return grouped;
}

//returns cups, rooms, standings (ordered by rank and with speller details fetched from spellers table), prelim rounds and break rounds from db
async function getBreakContext(tabId: string) {
  const [cups, rooms, standings, prelimRounds, breakRounds] = await Promise.all([
    db
      .select({
        id: cupCategoriesSB.cupCategoryId,
        cupCategory: cupCategoriesSB.cupCategory,
        cupOrder: cupCategoriesSB.cupOrder,
        breakNumber: cupCategoriesSB.breakNumber,
        breakCapacity: cupCategoriesSB.breakCapacity,
      })
      .from(cupCategoriesSB)
      .where(eq(cupCategoriesSB.tabId, tabId))
      .orderBy(asc(cupCategoriesSB.cupOrder), asc(cupCategoriesSB.cupCategoryId)),

    db
      .select({
        roomId: roomsSB.roomId,
        name: roomsSB.name,
      })
      .from(roomsSB)
      .where(and(eq(roomsSB.tabId, tabId),eq(roomsSB.available, true)))
      .orderBy(asc(roomsSB.roomId)),

    db
      .select({
        spellerId: standingsSB.spellerId,
        rank: standingsSB.rank,
        institutionId: spellers.institutionId,
        name: spellers.name,
      })
      .from(standingsSB)
      .innerJoin(spellers, eq(spellers.spellerId, standingsSB.spellerId))
      .where(and(eq(standingsSB.tabId, tabId), eq(spellers.available, true)))
      .orderBy(asc(standingsSB.rank), asc(standingsSB.spellerId)),

    db
      .select({
        roundId: roundsSB.roundId,
        name: roundsSB.name,
        number: roundsSB.number,
        completed: roundsSB.completed,
      })
      .from(roundsSB)
      .where(and(eq(roundsSB.tabId, tabId), eq(roundsSB.breaks, false)))
      .orderBy(asc(roundsSB.number), asc(roundsSB.roundId)),

    db
      .select({
        roundId: roundsSB.roundId,
        name: roundsSB.name,
        number: roundsSB.number,
        breakPhase: roundsSB.breakPhase,
        cupCategoryId: roundsSB.cupCategoryId,
        completed: roundsSB.completed,
      })
      .from(roundsSB)
      .where(and(eq(roundsSB.tabId, tabId), eq(roundsSB.breaks, true)))
      .orderBy(asc(roundsSB.number), asc(roundsSB.roundId)),
  ]);

  return {
    cups,
    rooms,
    standings,
    prelimRounds,
    breakRounds: breakRounds as BreakRoundRow[],
  };
}

async function getSubsequentBreakRoundReadiness(params: {
  tabId: string;
  round: BreakRoundRow;
  previousRound: BreakRoundRow;
  roomCapacity: number;
  availableRooms: number;
}) {
  const { tabId, round, previousRound, roomCapacity, availableRooms } = params;

  const participantRows = await db
    .select({
      drawSpellerId: drawSpellers.id,
      spellerId: drawSpellers.spellerId,
      institutionId: spellers.institutionId,
      status: resultsSB.status,
    })
    .from(drawsSB)
    .innerJoin(drawSpellers, eq(drawSpellers.drawId, drawsSB.drawId))
    .innerJoin(spellers, eq(spellers.spellerId, drawSpellers.spellerId))
    .leftJoin(resultsSB, eq(resultsSB.drawSpellerId, drawSpellers.id))
    .where(
      and(
        eq(drawsSB.tabId, tabId),
        eq(drawsSB.roundId, previousRound.roundId),
        eq(spellers.available, true)
      )
    )
    .orderBy(asc(drawsSB.roomId), asc(drawSpellers.id));
  
  const [prevRoundComplete]=await db
    .select({roundId: roundsSB.roundId, completed: roundsSB.completed})
    .from(roundsSB)
    .where(and(
        eq(roundsSB.tabId, tabId),
        eq(roundsSB.roundId, previousRound.roundId),
      ));

  const blockers: string[] = [];
  const warnings: string[] = [];

  if (!participantRows.length) {
    blockers.push(`No draw exists yet for ${previousRound.name}`);
  } else if (participantRows.some((row) => !row.status || row.status === "Incomplete") || !prevRoundComplete.completed) {
    blockers.push("Previous round incomplete");
  }

  const passedSpellers = participantRows.filter((row) => row.status === "Pass");

  if (!blockers.length && !passedSpellers.length) {
    blockers.push("No speller has been marked as passed from previous round");
  }

  const requestedRooms = passedSpellers.length
    ? Math.max(1, Math.ceil(passedSpellers.length / roomCapacity))
    : 0;
  const assignedRooms = Math.min(requestedRooms, availableRooms);

  if (!blockers.length && assignedRooms < requestedRooms) {
    warnings.push(`${round.name}: requested ${requestedRooms} rooms, found ${assignedRooms}`);
  }

  return {
    roundId: round.roundId,
    roundName: round.name,
    cupCategoryId: round.cupCategoryId,
    breakPhase: round.breakPhase,
    previousRoundId: previousRound.roundId,
    previousRoundName: previousRound.name,
    requestedRooms,
    assignedRooms,
    passCount: passedSpellers.length,
    ready: blockers.length === 0 && assignedRooms > 0,
    blockers,
    warnings,
  };
}

async function createDrawsForRound(
  tx: any,
  params: {
    tabId: string;
    roundId: number;
    roomAllocations: Array<{ roomId: number; allocatedBees: Array<{ spellerId: number; institutionId: number }> }>;
    roomJudgeAssignments?: Map<string, number[]>;
    judges?: Array<{ judgeId: number; institutionId: number }>;
  }
) {
  const { tabId, roundId, roomAllocations, roomJudgeAssignments, judges = [] } = params;

  //prevent redwaing completed rounds
  const [round] = await tx
      .select({
        roundId: roundsSB.roundId,
        completed: roundsSB.completed,
        name: roundsSB.name,
      })
      .from(roundsSB)
      .where(and(eq(roundsSB.tabId, tabId), eq(roundsSB.roundId, roundId)))
      .limit(1);

    if (!round) throw new Error("Round not found");
    if (round.completed) {
      throw new Error(`Cannot create or remake draws for a completed round: ${round.name}`);
    }

  await replaceExistingDrawsForRound(tx, tabId, roundId);

  const judgeByRoom =
    roomJudgeAssignments ??
    new Map(
      Array.from(
        allocateJudgesToRooms(judges, roomAllocations).entries(),
        ([roomId, judgeIds]) => [`${roundId}:${roomId}`, judgeIds] as const
      )
    );
  const results: Array<{
    drawId: number;
    roomId: number;
    spellerIds: number[];
    judgeIds: number[];
  }> = [];

  for (const alloc of roomAllocations) {
    const [newDraw] = await tx
      .insert(drawsSB)
      .values({
        tabId,
        roundId,
        roomId: alloc.roomId,
      })
      .returning({
        drawId: drawsSB.drawId,
        roomId: drawsSB.roomId,
      });

    await tx.insert(drawSpellers).values(
      alloc.allocatedBees.map((b) => ({
        tabId,
        drawId: newDraw.drawId,
        roomId: alloc.roomId,
        spellerId: b.spellerId,
      }))
    );

    const roomJudgeIds = judgeByRoom.get(`${roundId}:${alloc.roomId}`) ?? [];
    if (roomJudgeIds.length) {
      await tx.insert(drawJudgesSB).values(
        roomJudgeIds.map((judgeId) => ({
          tabId,
          drawId: newDraw.drawId,
          roomId: alloc.roomId,
          judgeId,
        }))
      );
    }

    results.push({
      drawId: newDraw.drawId,
      roomId: alloc.roomId,
      spellerIds: alloc.allocatedBees.map((b) => b.spellerId),
      judgeIds: roomJudgeIds,
    });
  }

  return results;
}

async function getBulkFirstPhaseRoundPlans(tabId: string) {
  const context = await getBreakContext(tabId);
  const plan = buildBreakPlan({
    cups: context.cups,
    standings: context.standings,
    rooms: context.rooms,
  });
  const breakRoundsByCup = groupBreakRoundsByCup(context.breakRounds);
  const incompletePrelims = context.prelimRounds.filter((round) => !round.completed);

  const firstPhaseRounds = plan.cups.map((cupPlan) => {
    const firstRound = breakRoundsByCup.get(cupPlan.cupId)?.[0] ?? null;
    const blockers: string[] = [];
    if (!firstRound) {
      blockers.push(`No break round exists for ${cupPlan.cupCategory}`);
    }
    if (incompletePrelims.length) {
      blockers.push(
        `Preliminary rounds incomplete: ${incompletePrelims.map((round) => round.name).join(", ")}`
      );
    }
    if (firstRound?.completed) {
      blockers.push(`${firstRound.name} has already been marked completed`);
    }

    return {
      ...cupPlan,
      roundId: firstRound?.roundId ?? null,
      roundName: firstRound?.name ?? null,
      breakPhase: firstRound?.breakPhase ?? null,
      completed: firstRound?.completed ?? false,
      ready: blockers.length === 0 && cupPlan.allocations.length > 0,
      blockers,
    };
  });

  return {
    ...context,
    plan,
    incompletePrelims,
    firstPhaseRounds,
  };
}

export async function generateBreaks(req: Request, res: Response) {
  try {
    const { tabId } = req.body as { tabId?: string };

    if (!tabId) {
      return res.status(400).json({ message: "tabId is required" });
    }

    const context = await getBreakContext(tabId);
    const plan = buildBreakPlan({
      cups: context.cups,
      standings: context.standings,
      rooms: context.rooms,
    });
    const breakRoundsByCup = groupBreakRoundsByCup(context.breakRounds);
    const incompletePrelims = context.prelimRounds.filter((round) => !round.completed);

    const firstPhaseRounds = plan.cups.map((cupPlan) => {
      const firstRound = breakRoundsByCup.get(cupPlan.cupId)?.[0] ?? null;
      const blockers: string[] = [];
      if (!firstRound) blockers.push(`No break round exists for ${cupPlan.cupCategory}`);
      if (incompletePrelims.length) {
        blockers.push(
          `Preliminary rounds incomplete: ${incompletePrelims.map((round) => round.name).join(", ")}`
        );
      }

      return {
        ...cupPlan,
        roundId: firstRound?.roundId ?? null,
        roundName: firstRound?.name ?? null,
        breakPhase: firstRound?.breakPhase ?? null,
        ready: blockers.length === 0 && cupPlan.allocations.length > 0,
        blockers,
      };
    });

    const subsequentRounds = (
      await Promise.all(
        Array.from(breakRoundsByCup.entries()).flatMap(([cupCategoryId, rounds]) => {
          const cup = context.cups.find((item) => item.id === cupCategoryId);
          if (!cup) return [];

          return rounds.slice(1).map((round, index) =>
            getSubsequentBreakRoundReadiness({
              tabId,
              round,
              previousRound: rounds[index],
              roomCapacity: cup.breakCapacity,
              availableRooms: context.rooms.length,
            })
          );
        })
      )
    ).sort((a, b) => {
      const aRound = context.breakRounds.find((round) => round.roundId === a.roundId);
      const bRound = context.breakRounds.find((round) => round.roundId === b.roundId);
      return (aRound?.number ?? 0) - (bRound?.number ?? 0);
    });

    return res.status(200).json({
      message: plan.ok ? "Break preview generated successfully" : "Break preview generated with blockers",
      data: {
        summary: {
          ...plan.summary,
          incompletePrelimRounds: incompletePrelims.map((round) => ({
            roundId: round.roundId,
            name: round.name,
          })),
        },
        errors: plan.errors,
        warnings: plan.warnings,
        firstPhaseRounds,
        subsequentRounds,
      },
    });
  } catch (error) {
    console.error("generateBreaks error:", error);
    return res.status(500).json({ message: "failed to generate breaks" });
  }
}

export async function generateBreakDraw(req: Request, res: Response) {
  try {
    const { tabId, roundId } = req.body as {
      tabId?: string;
      roundId?: number;
    };

    if (!tabId) {
      return res.status(400).json({ message: "tabId is required" });
    }

    //confirm tab isn't completed
    const [tab]= await db
      .select({completed: tabsSB.completed})
      .from(tabsSB)
      .where(eq(tabsSB.tabId, tabId));
    
    if(tab.completed) return res.status(400).json({message:'Tab marked as completed'});

    const [rooms, judges] = await Promise.all([
      db
        .select({
          roomId: roomsSB.roomId,
          name: roomsSB.name,
        })
        .from(roomsSB)
        .where(and(eq(roomsSB.tabId, tabId),eq(roomsSB.available, true)))
        .orderBy(asc(roomsSB.roomId)),

      db
        .select({
          judgeId: judgesSB.judgeId,
          institutionId: judgesSB.institutionId,
        })
        .from(judgesSB)
        .where(and(eq(judgesSB.tabId, tabId), eq(judgesSB.available, true))),
    ]);

    if (!rooms.length) {
      return res.status(400).json({ message: "No rooms available for this tab" });
    }

    if (!judges.length) {
      return res.status(400).json({ message: "No judges available in this tab" });
    }

    if (!roundId) {
      const firstPhaseContext = await getBulkFirstPhaseRoundPlans(tabId);
      if (firstPhaseContext.incompletePrelims.length) {
        return res.status(400).json({
          message: `Preliminary rounds incomplete: ${firstPhaseContext.incompletePrelims.map((round) => round.name).join(", ")}`,
          data: {
            incompleteRounds: firstPhaseContext.incompletePrelims.map((round) => ({
              roundId: round.roundId,
              name: round.name,
            })),
          },
        });
      }

      const drawableRounds = firstPhaseContext.firstPhaseRounds.filter(
        (round) => round.roundId && round.allocations.length && round.ready
      );

      if (!drawableRounds.length) {
        return res.status(400).json({
          message: "No eligible first-phase break rounds could be generated",
          data: {
            errors: firstPhaseContext.plan.errors,
            firstPhaseRounds: firstPhaseContext.firstPhaseRounds,
          },
        });
      }

      const created = await db.transaction(async (tx) => {
        const generatedRounds: Array<{
          roundId: number;
          roundName: string | null;
          cupCategory: string | null;
          warnings: string[];
          draws: Array<{
            drawId: number;
            roomId: number;
            spellerIds: number[];
            judgeIds: number[];
          }>;
          }> = [];

        const batchedRoundAllocations = drawableRounds.map((round) => ({
          roundId: round.roundId as number,
          roundName: round.roundName,
          roundNumber: context.breakRounds.find((item) => item.roundId === round.roundId)?.number ?? 0,
          roomAllocations: round.allocations.map((allocation) => ({
            roomId: allocation.roomId,
            allocatedBees: allocation.spellers.map((speller) => ({
              spellerId: speller.spellerId,
              institutionId: speller.institutionId,
            })),
          })),
        }));
        const judgeAssignments = allocateJudgesAcrossRoundRooms(judges, batchedRoundAllocations);

        for (const round of drawableRounds) {
          const roomAllocations = round.allocations.map((allocation) => ({
            roomId: allocation.roomId,
            allocatedBees: allocation.spellers.map((speller) => ({
              spellerId: speller.spellerId,
              institutionId: speller.institutionId,
            })),
          }));

          const draws = await createDrawsForRound(tx, {
            tabId,
            roundId: round.roundId as number,
            roomAllocations,
            roomJudgeAssignments: judgeAssignments,
          });

          generatedRounds.push({
            roundId: round.roundId as number,
            roundName: round.roundName,
            cupCategory: round.cupCategory,
            warnings: [...round.warnings, ...round.blockers].filter(Boolean),
            draws,
          });
        }

        return generatedRounds;
      });

      return res.status(201).json({
        message: "First-phase break draws generated successfully",
        data: {
          generatedRounds: created,
          skippedRounds: firstPhaseContext.firstPhaseRounds.filter(
            (round) => !round.roundId || !round.allocations.length
          ),
          warnings: firstPhaseContext.plan.warnings,
        },
      });
    }

    const [targetRound] = await db
      .select({
        roundId: roundsSB.roundId,
        name: roundsSB.name,
        number: roundsSB.number,
        breakPhase: roundsSB.breakPhase,
        cupCategoryId: roundsSB.cupCategoryId,
        breaks: roundsSB.breaks,
        completed: roundsSB.completed,
      })
      .from(roundsSB)
      .where(and(eq(roundsSB.tabId, tabId), eq(roundsSB.roundId, roundId)))
      .limit(1);

    if (!targetRound) {
      return res.status(404).json({ message: "Round not found in this tab" });
    }
    if (targetRound.completed) {
      return res.status(400).json({
        message: "This break round has already been marked as completed",
      });
    }
    if (!targetRound.breaks || !targetRound.cupCategoryId || !targetRound.breakPhase) {
      return res.status(400).json({ message: "Selected round is not a valid break round" });
    }

    const context = await getBulkFirstPhaseRoundPlans(tabId);
    const breakRoundsByCup = groupBreakRoundsByCup(context.breakRounds);
    const cupRounds = breakRoundsByCup.get(targetRound.cupCategoryId) ?? [];
    const firstRound = cupRounds[0];

    if (firstRound && firstRound.roundId === targetRound.roundId) {
      if (context.incompletePrelims.length) {
        return res.status(400).json({
          message: `Preliminary rounds incomplete: ${context.incompletePrelims.map((round) => round.name).join(", ")}`,
          data: {
            incompleteRounds: context.incompletePrelims.map((round) => ({
              roundId: round.roundId,
              name: round.name,
            })),
          },
        });
      }

      const drawableRounds = context.firstPhaseRounds.filter((round) => round.roundId && round.allocations.length && round.ready);
      const created = await db.transaction(async (tx) => {
        const generatedRounds: Array<{
          roundId: number;
          roundName: string | null;
          cupCategory: string | null;
          warnings: string[];
          draws: Array<{
            drawId: number;
            roomId: number;
            spellerIds: number[];
            judgeIds: number[];
          }>;
          }> = [];

        const batchedRoundAllocations = drawableRounds.map((round) => ({
          roundId: round.roundId as number,
          roundName: round.roundName,
          roundNumber: context.breakRounds.find((item) => item.roundId === round.roundId)?.number ?? 0,
          roomAllocations: round.allocations.map((allocation) => ({
            roomId: allocation.roomId,
            allocatedBees: allocation.spellers.map((speller) => ({
              spellerId: speller.spellerId,
              institutionId: speller.institutionId,
            })),
          })),
        }));
        const judgeAssignments = allocateJudgesAcrossRoundRooms(judges, batchedRoundAllocations);

        for (const round of drawableRounds) {
          const roomAllocations = round.allocations.map((allocation) => ({
            roomId: allocation.roomId,
            allocatedBees: allocation.spellers.map((speller) => ({
              spellerId: speller.spellerId,
              institutionId: speller.institutionId,
            })),
          }));

          const draws = await createDrawsForRound(tx, {
            tabId,
            roundId: round.roundId as number,
            roomAllocations,
            roomJudgeAssignments: judgeAssignments,
          });

          generatedRounds.push({
            roundId: round.roundId as number,
            roundName: round.roundName,
            cupCategory: round.cupCategory,
            warnings: [...round.warnings, ...round.blockers].filter(Boolean),
            draws,
          });
        }

        return generatedRounds;
      });

      return res.status(201).json({
        message: "First-phase break draws generated successfully",
        data: {
          generatedRounds: created,
          skippedRounds: context.firstPhaseRounds.filter((round) => !round.roundId || !round.allocations.length),
          warnings: context.plan.warnings,
        },
      });
    }

    const cup = context.cups.find((item) => item.id === targetRound.cupCategoryId);
    if (!cup) {
      return res.status(404).json({ message: "Cup configuration for this round was not found" });
    }

    const previousRoundIndex = cupRounds.findIndex((round) => round.roundId === targetRound.roundId) - 1;
    const previousRound = previousRoundIndex >= 0 ? cupRounds[previousRoundIndex] : null;

    if (!previousRound) {
      return res.status(400).json({ message: "Previous break round not found for this round" });
    }

    const previousParticipants = await db
      .select({
        spellerId: drawSpellers.spellerId,
        institutionId: spellers.institutionId,
        status: resultsSB.status,
      })
      .from(drawsSB)
      .innerJoin(drawSpellers, eq(drawSpellers.drawId, drawsSB.drawId))
      .innerJoin(spellers, eq(spellers.spellerId, drawSpellers.spellerId))
      .leftJoin(resultsSB, eq(resultsSB.drawSpellerId, drawSpellers.id))
      .where(
        and(
          eq(drawsSB.tabId, tabId),
          eq(drawsSB.roundId, previousRound.roundId),
          eq(spellers.available, true)
        )
      )
      .orderBy(asc(drawsSB.roomId), asc(drawSpellers.id));

    if (!previousParticipants.length) {
      return res.status(400).json({ message: `No draw exists yet for ${previousRound.name}` });
    }

    if (previousParticipants.some((row) => !row.status || row.status === "Incomplete")) {
      return res.status(400).json({ message: "Previous round incomplete" });
    }

    const passedSpellers = previousParticipants.filter((row) => row.status === "Pass");
    if (!passedSpellers.length) {
      return res.status(400).json({ message: "No speller has been marked as passed from previous round" });
    }

    const sameNumberEvaluations = context.breakRounds
      .filter((round) => round.number === targetRound.number)
      .map((round) => {
        const candidateCupRounds = breakRoundsByCup.get(round.cupCategoryId as number) ?? [];
        const candidateRoundIndex = candidateCupRounds.findIndex((item) => item.roundId === round.roundId);
        const isSubsequent = candidateRoundIndex > 0;

        return {
          round,
          candidateRoundIndex,
          isSubsequent,
          included: round.roundId === targetRound.roundId || isSubsequent,
          reason:
            round.roundId === targetRound.roundId
              ? "Target round"
              : isSubsequent
                ? "Same round number and has a previous break round"
                : "Skipped because it is a first-phase break round",
        };
      });

    const sameNumberRounds = sameNumberEvaluations
      .filter((entry) => entry.included && entry.round.roundId !== targetRound.roundId)
      .map((entry) => entry.round);

    const batchMetadata = {
      roundNumber: targetRound.number,
      includedRounds: sameNumberEvaluations
        .filter((entry) => entry.included)
        .map((entry) => ({
          roundId: entry.round.roundId,
          name: entry.round.name,
          breakPhase: entry.round.breakPhase,
          cupCategoryId: entry.round.cupCategoryId,
          reason: entry.reason,
        })),
      skippedRounds: sameNumberEvaluations
        .filter((entry) => !entry.included)
        .map((entry) => ({
          roundId: entry.round.roundId,
          name: entry.round.name,
          breakPhase: entry.round.breakPhase,
          cupCategoryId: entry.round.cupCategoryId,
          reason: entry.reason,
        })),
    };

    const sameNumberRoundPlans: Array<{
      roundId: number;
      roundName: string;
      previousRoundId: number;
      previousRoundName: string;
      passCount: number;
      requestedRooms: number;
      assignedRooms: number;
      roomAllocations: Array<{ roomId: number; allocatedBees: Array<{ spellerId: number; institutionId: number }> }>;
      warnings: string[];
    }> = [];

    const allSameNumberRounds = [targetRound, ...sameNumberRounds]
      .sort((a, b) => a.number - b.number || a.roundId - b.roundId);

    for (const round of allSameNumberRounds) {
      const roundCup = context.cups.find((item) => item.id === round.cupCategoryId);
      if (!roundCup) {
        return res.status(404).json({
          message: `Cup configuration for ${round.name} was not found`,
          data: batchMetadata,
        });
      }

      const roundCupRounds = breakRoundsByCup.get(round.cupCategoryId as number) ?? [];
      const roundPreviousIndex = roundCupRounds.findIndex((item) => item.roundId === round.roundId) - 1;
      const roundPrevious = roundPreviousIndex >= 0 ? roundCupRounds[roundPreviousIndex] : null;

      if (!roundPrevious) {
        return res.status(400).json({
          message: `Previous break round not found for ${round.name}`,
          data: batchMetadata,
        });
      }

      const roundPreviousParticipants = await db
        .select({
          spellerId: drawSpellers.spellerId,
          institutionId: spellers.institutionId,
          status: resultsSB.status,
        })
        .from(drawsSB)
        .innerJoin(drawSpellers, eq(drawSpellers.drawId, drawsSB.drawId))
        .innerJoin(spellers, eq(spellers.spellerId, drawSpellers.spellerId))
        .leftJoin(resultsSB, eq(resultsSB.drawSpellerId, drawSpellers.id))
        .where(
          and(
            eq(drawsSB.tabId, tabId),
            eq(drawsSB.roundId, roundPrevious.roundId),
            eq(spellers.available, true)
          )
        )
        .orderBy(asc(drawsSB.roomId), asc(drawSpellers.id));

      if (!roundPreviousParticipants.length) {
        return res.status(400).json({
          message: `No draw exists yet for ${roundPrevious.name}`,
          data: batchMetadata,
        });
      }

      if (roundPreviousParticipants.some((row) => !row.status || row.status === "Incomplete")) {
        return res.status(400).json({
          message: "Previous round incomplete",
          data: {
            ...batchMetadata,
            blockedRound: {
              roundId: round.roundId,
              name: round.name,
              previousRoundId: roundPrevious.roundId,
              previousRoundName: roundPrevious.name,
            },
          },
        });
      }

      const roundPassedSpellers = roundPreviousParticipants.filter((row) => row.status === "Pass");
      if (!roundPassedSpellers.length) {
        return res.status(400).json({
          message: "No speller has been marked as passed from previous round",
          data: {
            ...batchMetadata,
            blockedRound: {
              roundId: round.roundId,
              name: round.name,
              previousRoundId: roundPrevious.roundId,
              previousRoundName: roundPrevious.name,
            },
          },
        });
      }

      const requestedRooms = Math.max(1, Math.ceil(roundPassedSpellers.length / roundCup.breakCapacity));
      sameNumberRoundPlans.push({
        roundId: round.roundId,
        roundName: round.name,
        previousRoundId: roundPrevious.roundId,
        previousRoundName: roundPrevious.name,
        passCount: roundPassedSpellers.length,
        requestedRooms,
        assignedRooms: 0,
        roomAllocations: [],
        warnings: [],
      });
    }

    let roomCursor = 0;
    for (const planItem of sameNumberRoundPlans) {
      const round = allSameNumberRounds.find((item) => item.roundId === planItem.roundId)!;
      const roundCup = context.cups.find((item) => item.id === round.cupCategoryId)!;
      const roundCupRounds = breakRoundsByCup.get(round.cupCategoryId as number) ?? [];
      const roundPrevious = roundCupRounds[roundCupRounds.findIndex((item) => item.roundId === round.roundId) - 1]!;

      const roundPreviousParticipants = await db
        .select({
          spellerId: drawSpellers.spellerId,
          institutionId: spellers.institutionId,
          status: resultsSB.status,
        })
        .from(drawsSB)
        .innerJoin(drawSpellers, eq(drawSpellers.drawId, drawsSB.drawId))
        .innerJoin(spellers, eq(spellers.spellerId, drawSpellers.spellerId))
        .leftJoin(resultsSB, eq(resultsSB.drawSpellerId, drawSpellers.id))
        .where(
          and(
            eq(drawsSB.tabId, tabId),
            eq(drawsSB.roundId, roundPrevious.roundId),
            eq(spellers.available, true)
          )
        )
        .orderBy(asc(drawsSB.roomId), asc(drawSpellers.id));

      const roundPassedSpellers = roundPreviousParticipants.filter((row) => row.status === "Pass");
      const assignedRooms = Math.min(planItem.requestedRooms, rooms.length - roomCursor);
      const selectedRooms = rooms.slice(roomCursor, roomCursor + assignedRooms);
      roomCursor += assignedRooms;

      planItem.assignedRooms = assignedRooms;
      if (assignedRooms < planItem.requestedRooms) {
        planItem.warnings.push(`${planItem.roundName}: requested ${planItem.requestedRooms} rooms, found ${assignedRooms}`);
      }

      const usableSpellerCount = Math.min(roundPassedSpellers.length, assignedRooms * roundCup.breakCapacity);
      if (usableSpellerCount < roundPassedSpellers.length) {
        planItem.warnings.push(
          `${planItem.roundName}: ${roundPassedSpellers.length - usableSpellerCount} passed spellers could not be placed because only ${assignedRooms} rooms were available`
        );
      }

      const roomAllocations = allocateSlidingPowerPair(
        selectedRooms.map((room) => ({ roomId: room.roomId })),
        roundPassedSpellers.slice(0, usableSpellerCount)
      ).map((allocation) => ({
        roomId: allocation.roomId,
        allocatedBees: allocation.allocatedBees.map((speller) => ({
          spellerId: speller.spellerId,
          institutionId: speller.institutionId,
        })),
      }));

      planItem.roomAllocations = roomAllocations;
    }

    const drawableSameNumberRounds = sameNumberRoundPlans.filter((planItem) => planItem.roomAllocations.length);

    if (!drawableSameNumberRounds.length) {
      return res.status(400).json({
        message: "No break draws could be generated for this round number",
        warnings: sameNumberRoundPlans.flatMap((planItem) => planItem.warnings),
        data: batchMetadata,
      });
    }

    const created = await db.transaction(async (tx) => {
      const judgeAssignments = allocateJudgesAcrossRoundRooms(
        judges,
        drawableSameNumberRounds.map((planItem) => ({
          roundId: planItem.roundId,
          roundName: planItem.roundName,
          roundNumber: targetRound.number,
          roomAllocations: planItem.roomAllocations,
        }))
      );

      const createdRounds: Array<{
        roundId: number;
        roundName: string;
        previousRoundId: number;
        previousRoundName: string;
        passCount: number;
        requestedRooms: number;
        assignedRooms: number;
        warnings: string[];
        draws: Array<{
          drawId: number;
          roomId: number;
          spellerIds: number[];
          judgeIds: number[];
        }>;
      }> = [];

      for (const planItem of drawableSameNumberRounds) {
        const draws = await createDrawsForRound(tx, {
          tabId,
          roundId: planItem.roundId,
          roomAllocations: planItem.roomAllocations,
          roomJudgeAssignments: judgeAssignments,
        });

        createdRounds.push({
          roundId: planItem.roundId,
          roundName: planItem.roundName,
          previousRoundId: planItem.previousRoundId,
          previousRoundName: planItem.previousRoundName,
          passCount: planItem.passCount,
          requestedRooms: planItem.requestedRooms,
          assignedRooms: planItem.assignedRooms,
          warnings: planItem.warnings,
          draws,
        });
      }

      return createdRounds;
    });

    return res.status(201).json({
      message: "Break draws generated successfully",
      warnings: sameNumberRoundPlans.flatMap((planItem) => planItem.warnings),
      data: {
        roundNumber: targetRound.number,
        batch: batchMetadata,
        generatedRounds: created,
      },
    });
  } catch (error) {
    console.error("generateBreakDraw error:", error);
    return res.status(500).json({ message: "failed to generate break draw" });
  }
}
