import { Request, Response } from 'express';
import { db } from '../../db/db';
import { resultsSB, standingsSB, drawSpellers, drawsSB, spellers, roundsSB, tabsSB } from '../../db/schema';
import { eq, and, inArray } from 'drizzle-orm';

const allowedStatuses = ["Eliminated", "Pass", "Incomplete"] as const;
type ResultStatus = (typeof allowedStatuses)[number];

type StandingRoundScore = {
  roundId: number;
  score: number | null;
  status: ResultStatus | null;
};

export async function rebuildStandingsForTab(tabId: string) {
  const allSpellers = await db
    .select({
      spellerId: spellers.spellerId,
    })
    .from(spellers)
    .where(eq(spellers.tabId, tabId));

  const resultRows = await db
    .select({
      spellerId: drawSpellers.spellerId,
      roundId: drawsSB.roundId,
      score: resultsSB.score,
      status: resultsSB.status,
    })
    .from(resultsSB)
    .innerJoin(drawSpellers, eq(resultsSB.drawSpellerId, drawSpellers.id))
    .innerJoin(drawsSB, eq(drawSpellers.drawId, drawsSB.drawId))
    .innerJoin(roundsSB, eq(drawsSB.roundId, roundsSB.roundId))
    .where(and(eq(drawSpellers.tabId, tabId), eq(roundsSB.breaks, false)));

  const standingMap = new Map<number, { totalScore: number; roundScores: StandingRoundScore[] }>();

  for (const speller of allSpellers) {
    standingMap.set(speller.spellerId, { totalScore: 0, roundScores: [] });
  }

  for (const row of resultRows) {
    const existing = standingMap.get(row.spellerId) ?? { totalScore: 0, roundScores: [] };

    existing.roundScores.push({
      roundId: row.roundId,
      score: row.score,
      status: row.status,
    });
    existing.totalScore += row.score ?? 0;

    standingMap.set(row.spellerId, existing);
  }

  const ranked = [...standingMap.entries()]
    .map(([spellerId, data]) => ({
      spellerId,
      totalScore: data.totalScore,
      roundScores: data.roundScores.sort((a, b) => a.roundId - b.roundId),
    }))
    .sort((a, b) => {
      if (b.totalScore !== a.totalScore) return b.totalScore - a.totalScore;
      return a.spellerId - b.spellerId;
    });

  await db.delete(standingsSB).where(eq(standingsSB.tabId, tabId));

  if (!ranked.length) return;

  let currentRank = 1;
  const standingsValues = ranked.map((entry, index) => {
    if (index > 0 && entry.totalScore < ranked[index - 1].totalScore) {
      currentRank = index + 1;
    }

    return {
      tabId,
      spellerId: entry.spellerId,
      totalScore: entry.totalScore,
      roundScores: JSON.stringify(entry.roundScores),
      rank: currentRank,
    };
  });

  await db.insert(standingsSB).values(standingsValues);
}

export async function ballot(req: Request,res: Response){
  try {
    const {tabId, roomId, roundId, spellerId, status, score}=req.body as {
      tabId: string;
      roomId: number;
      roundId: number;
      spellerId: number;
      status?: ResultStatus;
      score?: number;
    }
    if(!tabId || !roomId || !roundId || !spellerId)
      return res.status(400).json({message: 'Specify room, round and speller'});
    if (status === undefined && score === undefined)
      return res.status(400).json({ message: "Provide either status or score" });

    if (status !== undefined && !allowedStatuses.includes(status)) {
      return res.status(400).json({ message: "Invalid result status" });
    }
    
    //confirm tab isn't completed
    const [tab]= await db
      .select({completed: tabsSB.completed})
      .from(tabsSB)
      .where(eq(tabsSB.tabId, tabId));
    
    if(tab.completed) return res.status(400).json({message:'Tab marked as completed'});
    //confirm round exists in tab and if complete
        const [round] = await db
          .select({
            completed: roundsSB.completed,
          })
          .from(roundsSB)
          .where(and(eq(roundsSB.tabId, tabId), eq(roundsSB.roundId, roundId)))
          .limit(1);
        if (!round) {
          return res.status(404).json({ message: "Round not found in this tab" });
        }
        if(round.completed)
          return res.status(400).json({message: 'This round has been marked as completed on tab'});

    //find drawId from room and round ids
    const drawId=await db.select({drawId: drawsSB.drawId})
      .from(drawsSB)
      .where(and(eq(drawsSB.roomId, roomId), eq(drawsSB.roundId, roundId), eq(drawsSB.tabId, tabId)))
      .limit(1);
    if (!drawId.length) return res.status(400).json({message:"This draw doesn't exist"});

    //find drawSpeller
    const drawSpellerId=await db
      .select({id: drawSpellers.id})
      .from(drawSpellers)
      .where(and (eq(drawSpellers.drawId, drawId[0].drawId), eq(drawSpellers.spellerId, spellerId )))
      .limit(1);
    if (!drawSpellerId.length) return res.status(400).json({message:"This speller wasn't in draw"});

    //find result if it exists
    const result= await db
      .select({resultId: resultsSB.resultId, score: resultsSB.score, status: resultsSB.status, drawSpellerId: resultsSB.drawSpellerId})
      .from(resultsSB)
      .where(eq(resultsSB.drawSpellerId, drawSpellerId[0].id))
      .limit(1);

    if (!result.length){
      const newResult= await db
        .insert(resultsSB)
        .values({
          drawSpellerId: drawSpellerId[0].id,
          score: score,
          status: status ?? null
        })
        .returning({
          resultId: resultsSB.resultId,
          drawSpellerId: resultsSB.drawSpellerId,
          score: resultsSB.score,
          status: resultsSB.status,
          createdAt: resultsSB.createdAt,
          updatedAt: resultsSB.updatedAt,
        })

        await rebuildStandingsForTab(tabId);

        return res.status(200).json(
          {message:'Result added',
          data: newResult[0],
          });
    }
    else{
      const updates:{score?: number; status?: ResultStatus | null}={};
        if(score!==undefined) updates.score=score;
        if(status!==undefined) updates.status=status;
        // console.log(updates);
      const updatedResult= await db
        .update(resultsSB)
        .set({...updates})
        .where(eq(resultsSB.resultId, result[0].resultId))
        .returning({
          resultId: resultsSB.resultId,
          drawSpellerId: resultsSB.drawSpellerId,
          score: resultsSB.score,
          status: resultsSB.status,
          createdAt: resultsSB.createdAt,
          updatedAt: resultsSB.updatedAt,
        });
      await rebuildStandingsForTab(tabId);
        // console.log(updatedResult);
      return res.status(200).json({ 
        message: "Result updated", 
        data: updatedResult[0] 
      });
    }
  } 
  catch (error){
    console.error("updateBallot error:", error);
    return res.status(500).json({ message: "failed to update result" });
  }
}

export async function batchBallot(req: Request, res: Response) {
  try{
    const { tabId, roundId, roomId, updates } = req.body as {
      tabId: string;
      roundId: number;
      roomId: number;
      updates: Array<{
        spellerId: number;
        score?: number;
        status?: ResultStatus;
      }>;
    };

    if (!tabId || !roundId || !roomId || !Array.isArray(updates) || !updates.length) {
      return res.status(400).json({ message: "tabId, roundId, roomId and updates are required" });
    }
    //confirm tab isn't completed
    const [tab]= await db
      .select({completed: tabsSB.completed})
      .from(tabsSB)
      .where(eq(tabsSB.tabId, tabId));
    
    if(tab.completed) return res.status(400).json({message:'Tab marked as completed'}); 

    //confirm round exists in tab and if complete
        const [round] = await db
          .select({
            completed: roundsSB.completed,
          })
          .from(roundsSB)
          .where(and(eq(roundsSB.tabId, tabId), eq(roundsSB.roundId, roundId)))
          .limit(1);
        if (!round) {
          return res.status(404).json({ message: "Round not found in this tab" });
        }
        if(round.completed)
          return res.status(400).json({message: 'This round has been marked as completed on tab'});

    for (const item of updates) {
      if (!item.spellerId) {
        return res.status(400).json({ message: "Each update must include spellerId" });
      }

      if (item.score === undefined && item.status === undefined) {
        return res.status(400).json({ message: "Each update must include score or status" });
      }

      if (item.status !== undefined && !allowedStatuses.includes(item.status)) {
        return res.status(400).json({ message: `Invalid result status for speller ${item.spellerId}` });
      }
    }
    
    const drawRow = await db
      .select({ drawId: drawsSB.drawId })
      .from(drawsSB)
      .where(
        and(
          eq(drawsSB.tabId, tabId),
          eq(drawsSB.roundId, roundId),
          eq(drawsSB.roomId, roomId)
        )
      )
      .limit(1);

    if (!drawRow.length) {
      return res.status(404).json({ message: "Draw not found for this room and round" });
    }
    const drawId = drawRow[0].drawId;
    const requestedSpellerIds = updates.map((u) => u.spellerId);

    const drawSpellerRows = await db
      .select({
        drawSpellerId: drawSpellers.id,
        spellerId: drawSpellers.spellerId,
      })
      .from(drawSpellers)
      .where(
        and(
          eq(drawSpellers.tabId, tabId),
          eq(drawSpellers.drawId, drawId),
          inArray(drawSpellers.spellerId, requestedSpellerIds)
        )
      );

    if (drawSpellerRows.length !== requestedSpellerIds.length) {
      return res.status(400).json({ message: "One or more spellers are not in this draw" });
    }

  const drawSpellerIdBySpellerId = new Map(
      drawSpellerRows.map((row) => [row.spellerId, row.drawSpellerId])
    );

    const drawSpellerIds = drawSpellerRows.map((row) => row.drawSpellerId);

    const existingResults = await db
      .select({
        resultId: resultsSB.resultId,
        drawSpellerId: resultsSB.drawSpellerId,
      })
      .from(resultsSB)
      .where(inArray(resultsSB.drawSpellerId, drawSpellerIds));

    const resultIdByDrawSpellerId = new Map(
      existingResults.map((row) => [row.drawSpellerId, row.resultId])
    );

    const savedResults = await db.transaction(async (tx) => {
      const rows = [];

      for (const item of updates) {
        const drawSpellerId = drawSpellerIdBySpellerId.get(item.spellerId)!;
        const existingResultId = resultIdByDrawSpellerId.get(drawSpellerId);

        const values: { score?: number; status?: ResultStatus } = {};
        if (item.score !== undefined) values.score = item.score;
        if (item.status !== undefined) values.status = item.status as ResultStatus;
        console.log(item);

        if (existingResultId) {
          const updated = await tx
            .update(resultsSB)
            .set(values)
            .where(eq(resultsSB.resultId, existingResultId))
            .returning({
              resultId: resultsSB.resultId,
              drawSpellerId: resultsSB.drawSpellerId,
              score: resultsSB.score,
              status: resultsSB.status,
              updatedAt: resultsSB.updatedAt,
            });

          rows.push(updated[0]);
        } else {
          const inserted = await tx
            .insert(resultsSB)
            .values({
              drawSpellerId,
              ...values,
            })
            .returning({
              resultId: resultsSB.resultId,
              drawSpellerId: resultsSB.drawSpellerId,
              score: resultsSB.score,
              status: resultsSB.status,
              createdAt: resultsSB.createdAt,
              updatedAt: resultsSB.updatedAt,
            });

          rows.push(inserted[0]);
        }
      }

      return rows;
    });

    await rebuildStandingsForTab(tabId);

    return res.status(200).json({
      message: "Batch results saved",
      data: savedResults,
    });
  }
  catch (error) {
    console.error("batchBallot error:", error);
    return res.status(500).json({ message: "Failed to save batch results" });
  }
}
export async function deleteBallot(req: Request,res: Response){
  try {
    const {tabId, roundId, roomId, spellerId}= req.body as {
      tabId: string;
      roundId: number;
      roomId: number;
      spellerId: number;
    }
    if (!tabId || !roundId || !roomId || !spellerId)
      return res.status(400).json({message:'specify tab, round, room and speller'});

    //confirm tab isn't completed
    const [tab]= await db
      .select({completed: tabsSB.completed})
      .from(tabsSB)
      .where(eq(tabsSB.tabId, tabId));
    
    if(tab.completed) return res.status(400).json({message:'Tab marked as completed'});

    //confirm round exists in tab and if complete
        const [round] = await db
          .select({
            completed: roundsSB.completed,
          })
          .from(roundsSB)
          .where(and(eq(roundsSB.tabId, tabId), eq(roundsSB.roundId, roundId)))
          .limit(1);
        if (!round) {
          return res.status(404).json({ message: "Round not found in this tab" });
        }
        if(round.completed)
          return res.status(400).json({message: 'This round has been marked as completed on tab'});
    
    //find draw
    const drawRow= await db
      .select({drawId: drawsSB.drawId})
      .from(drawsSB)
      .where(and(eq(drawsSB.tabId, tabId),eq(drawsSB.roundId, roundId), eq(drawsSB.roomId, roomId)))
      .limit(1);
    
    if (!drawRow.length) {
      return res.status(404).json({ message: 'draw not found' });
    }
    const drawId=drawRow[0].drawId;
    // console.log(drawId);
    if(!drawId) 
      return res.status(404).json({message:'draw not found'});

    //find drawSpeller and id
    const drawSpellerRow= await db
      .select({drawSpellerId: drawSpellers.id})
      .from(drawSpellers)
      .where(and(eq(drawSpellers.drawId, drawId), eq(drawSpellers.spellerId, spellerId), eq(drawSpellers.tabId, tabId)))
      .limit(1);
      // console.log(drawSpellerRow[0].drawSpellerId);
    const drawSpellerId=drawSpellerRow[0].drawSpellerId;
    if(!drawSpellerId) return res.status(404).json({message:"speller wasn't in draw"});

    //find result
    const result= await db
      .select({resultId: resultsSB.resultId})
      .from(resultsSB)
      .where(eq(resultsSB.drawSpellerId, drawSpellerId))
    
    if(!result.length) {
      return res.status(404).json({message:'Speller result not submitted yet'});
    }
    
    //delete result
    const deleted= await db
      .delete(resultsSB)
      .where(eq(resultsSB.drawSpellerId, drawSpellerId))
      .returning({
              resultId: resultsSB.resultId,
            });
      
          if (!deleted.length) {
            return res.status(404).json({ message: "Result not deleted" });
          }

          await rebuildStandingsForTab(tabId);
      
          return res.status(200).json({
            message: "result deleted successfully",
            data: deleted[0],
          });
      
  } 
  catch (error){
    console.error("deleteBallot error:", error);
    return res.status(500).json({ message: "failed to delete result" });
  }
}
