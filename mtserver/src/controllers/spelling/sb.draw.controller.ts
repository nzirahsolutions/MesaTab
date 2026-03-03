import { Request, Response } from "express";
import { and, eq, inArray } from "drizzle-orm";
import { db } from "../../db/db";
import { drawsSB, drawJudgesSB, drawSpellers, roomsSB,spellers, judgesSB, roundsSB} from "../../db/schema";

function shuffle<T>(array: T[]): T[] {
  const arr = [...array]; // avoid mutating original
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}


export async function getDraws(req: Request, res: Response){
    try {
        
    } 
    catch (error){
        console.error("generateDraw error:", error);
        return res.status(500).json({ message: "failed to get draws" });
    }
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

    //if power-paired
    if(powerPair){
        console.log('powerPaired');
    }
    // TODO: plug in standings-based ordering if powerPair is true.
    const shuffledBees = powerPair ? [...bees] : shuffle(bees);

    // Allocate spellers across rooms (first rooms receive extras)
    const basePerRoom = Math.floor(shuffledBees.length / rooms.length);
    const extra = shuffledBees.length % rooms.length;

    let beeCursor = 0;
    const roomAllocations = rooms
      .map((room, i) => {
        const size = basePerRoom + (i < extra ? 1 : 0);
        const allocatedBees = shuffledBees.slice(beeCursor, beeCursor + size);
        beeCursor += size;
        return { roomId: room.roomId, allocatedBees };
      })
      .filter((a) => a.allocatedBees.length > 0);

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
        console.error("generateDraw error:", error);
        return res.status(500).json({ message: "failed to generate breaks" });
    }
}