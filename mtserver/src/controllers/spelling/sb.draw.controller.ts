import { Request, Response } from "express";
import { and, asc, eq, inArray } from "drizzle-orm";
import { db } from "../../db/db";
import { drawsSB, drawJudgesSB, drawSpellers, roomsSB,spellers, judgesSB, roundsSB, standingsSB} from "../../db/schema";

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

export async function generateDraw(req: Request, res: Response){
    // console.log(req.body);
    try {
    const {roundId, tabId, powerPair}=req.body as{
        roundId?: number;
        tabId?: string;
        powerPair?: boolean;
    };
    const replaceExisting=true;
    if (!roundId || !tabId) 
        return res.status(400).json({message:'Tab Id and round required'});

    //confirm round exists in tab
    const [round] = await db
      .select({
        roundId: roundsSB.roundId,
        tabId: roundsSB.tabId,
        name: roundsSB.name,
        breaks: roundsSB.breaks,
      })
      .from(roundsSB)
      .where(and(eq(roundsSB.tabId, tabId), eq(roundsSB.roundId, roundId)))
      .limit(1);
    if (!round) {
      return res.status(404).json({ message: "Round not found in this tab" });
    }

    // Load required entities
    const [rooms, bees, judges] = await Promise.all([
      db
        .select({
          roomId: roomsSB.roomId,
          name: roomsSB.name,
        })
        .from(roomsSB)
        .where(eq(roomsSB.tabId, tabId)),

      db
        .select({
          spellerId: spellers.spellerId,
          institutionId: spellers.institutionId,
        })
        .from(spellers)
        .where(eq(spellers.tabId, tabId)),

      db
        .select({
          judgeId: judgesSB.judgeId,
          institutionId: judgesSB.institutionId,
        })
        .from(judgesSB)
        .where(eq(judgesSB.tabId, tabId)),
    ]);

    if (!rooms.length) return res.status(400).json({ message: "No rooms found for this tab" });
    if (!bees.length) return res.status(400).json({ message: "No spellers found for this tab" });
    if (!judges.length) return res.status(400).json({ message: "No judges found in this tab" });

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

    // Judge allocation: avoid same institution conflict where possible
    const availableJudges = shuffle(judges);
    const baseJudgesPerRoom = Math.floor(availableJudges.length / roomAllocations.length);
    const extraJudges = availableJudges.length % roomAllocations.length;

    let judgeCursor = 0;

    const judgeAllocations = roomAllocations.map((alloc, i) => {
    const size = baseJudgesPerRoom + (i < extraJudges ? 1 : 0);
    const spellerInst = new Set(alloc.allocatedBees.map((b) => b.institutionId));

    // candidate pool for this room slice
    const chunk = availableJudges.slice(judgeCursor, judgeCursor + size);
    judgeCursor += size;

    // optional: conflict-safe first
    const noConflict = chunk.filter((j) => !spellerInst.has(j.institutionId));
    const conflict = chunk.filter((j) => spellerInst.has(j.institutionId));

    return {
        roomId: alloc.roomId,
        judgeIds: [...noConflict, ...conflict].map((j) => j.judgeId), // keep all, prioritize no-conflict
    };
    });
    const judgeByRoom = new Map(judgeAllocations.map((j) => [j.roomId, j.judgeIds]));
    // console.log(judgeByRoom);

    const created = await db.transaction(async (tx) => {
      if (replaceExisting) {
        const existingDraws = await tx
          .select({ drawId: drawsSB.drawId })
          .from(drawsSB)
          .where(and(eq(drawsSB.tabId, tabId), eq(drawsSB.roundId, roundId)));

        const drawIds = existingDraws.map((d) => d.drawId);
        if (drawIds.length) {
          await tx.delete(drawSpellers).where(inArray(drawSpellers.drawId, drawIds));
          await tx.delete(drawJudgesSB).where(inArray(drawJudgesSB.drawId, drawIds));
          await tx.delete(drawsSB).where(inArray(drawsSB.drawId, drawIds));
        }
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
export async function generateBreaks(req: Request, res: Response){
    try {
        
    } 
    catch (error){
        console.error("generateBreaks error:", error);
        return res.status(500).json({ message: "failed to generate breaks" });
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
    if(!roundId || room1==0 || room2===0 || swapState===0 || !tabId)
        return res.status(400).json({message:'Must select rounds, rooms and update operation'});
    if(room1==room2)
        return res.status(400).json({message:'Select different rooms'});
    if(swapState===1 && (!speller1 || !speller2))
        return res.status(400).json({message:'Select two spellers to swap'});
    if(swapState===2 && (!judge1 || !judge2))
        return res.status(400).json({message:'Select two judges to swap'});
    if(swapState===3 && !speller1)
        return res.status(400).json({message:'Select speller to move'});
    if(swapState===4 && !judge1)
        return res.status(400).json({message:'Select judge to move'});
    
    //confirm round exists in tab
    const [round] = await db
      .select({
        roundId: roundsSB.roundId,
        tabId: roundsSB.tabId,
        name: roundsSB.name,
        breaks: roundsSB.breaks,
      })
      .from(roundsSB)
      .where(and(eq(roundsSB.tabId, tabId), eq(roundsSB.roundId, roundId)))
      .limit(1);
    if (!round) {
      return res.status(404).json({ message: "Round not found in this tab" });
    }

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
      message: "Spellerrs swapped successfully",
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

    return res.status(400).json({message: 'Unsupported update operation (swapState)'});
  } 
    catch (error){
      const msg = error instanceof Error ? error.message : "failed to update draw";
      return res.status(500).json({ message: msg });
    }
}
export async function deleteDraw(req: Request, res: Response){
  try {
    const {roundId, tabId}=req.body as{
      roundId: number;
      tabId: string;
    }
    if(!roundId || roundId===0 || !tabId) return res.status(400).json({message:'Please select a round'});

    //confirm round exists in tab
    const [round] = await db
      .select({
        roundId: roundsSB.roundId,
        tabId: roundsSB.tabId,
        name: roundsSB.name,
        breaks: roundsSB.breaks,
      })
      .from(roundsSB)
      .where(and(eq(roundsSB.tabId, tabId), eq(roundsSB.roundId, roundId)))
      .limit(1);
    if (!round) {
      return res.status(404).json({ message: "Round not found in this tab" });
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
