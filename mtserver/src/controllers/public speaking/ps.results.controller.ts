import { Request, Response } from 'express';
import { and, eq, inArray } from 'drizzle-orm';
import { db } from '../../db/db';
import { resultsPS, standingsPS, drawSpeakersPS, drawsPS, speakersPS, roundsPS, tabsPS } from '../../db/schema';

const allowedStatuses = ['Eliminated', 'Pass', 'Incomplete'] as const;
type ResultStatus = (typeof allowedStatuses)[number];

type StandingRoundScore = {
  roundId: number;
  score: number;
  status: ResultStatus | null;
};

function parseScoreInput(value: unknown): number | null {
  if (value === undefined || value === null || value === '') return null;
  const parsed = Number(value);
  if (!Number.isInteger(parsed)) return Number.NaN;
  return parsed;
}

async function getRoundContext(tabId: string, roundId: number) {
  const roundRows = await db
    .select({
      roundId: roundsPS.roundId,
      breaks: roundsPS.breaks,
      completed: roundsPS.completed,
      minScore: tabsPS.minScore,
      maxScore: tabsPS.maxScore,
    })
    .from(roundsPS)
    .innerJoin(tabsPS, eq(roundsPS.tabId, tabsPS.tabId))
    .where(and(eq(roundsPS.tabId, tabId), eq(roundsPS.roundId, roundId)))
    .limit(1);

  return roundRows[0] ?? null;
}

function validateResultInput(params: {
  score: unknown;
  status: unknown;
  minScore: number;
  maxScore: number;
  breaks: boolean;
}) {
  const parsedScore = parseScoreInput(params.score);
  if (parsedScore === null || Number.isNaN(parsedScore)) {
    return { ok: false as const, message: 'Score must be an integer' };
  }
  if (parsedScore < params.minScore || parsedScore > params.maxScore) {
    return {
      ok: false as const,
      message: `Score must be between ${params.minScore} and ${params.maxScore}`,
    };
  }

  if (params.breaks) {
    if (typeof params.status !== 'string' || !allowedStatuses.includes(params.status as ResultStatus)) {
      return { ok: false as const, message: 'Break rounds require a valid result status' };
    }
    return {
      ok: true as const,
      score: parsedScore,
      status: params.status as ResultStatus,
    };
  }

  if (params.status !== undefined && params.status !== null && params.status !== '') {
    if (typeof params.status !== 'string' || !allowedStatuses.includes(params.status as ResultStatus)) {
      return { ok: false as const, message: 'Invalid result status' };
    }
  }

  return {
    ok: true as const,
    score: parsedScore,
    status: null,
  };
}

export async function rebuildStandingsForTab(tabId: string) {
  const allSpeakers = await db
    .select({
      speakerId: speakersPS.speakerId,
    })
    .from(speakersPS)
    .where(eq(speakersPS.tabId, tabId));

  const resultRows = await db
    .select({
      speakerId: drawSpeakersPS.speakerId,
      roundId: drawsPS.roundId,
      score: resultsPS.score,
      status: resultsPS.status,
    })
    .from(resultsPS)
    .innerJoin(drawSpeakersPS, eq(resultsPS.drawSpeakerId, drawSpeakersPS.id))
    .innerJoin(drawsPS, eq(drawSpeakersPS.drawId, drawsPS.drawId))
    .innerJoin(roundsPS, eq(drawsPS.roundId, roundsPS.roundId))
    .where(and(eq(drawSpeakersPS.tabId, tabId), eq(roundsPS.breaks, false)));

  const standingMap = new Map<number, { totalScore: number; appearances: number; roundScores: StandingRoundScore[] }>();

  for (const speaker of allSpeakers) {
    standingMap.set(speaker.speakerId, { totalScore: 0, appearances: 0, roundScores: [] });
  }

  for (const row of resultRows) {
    const existing = standingMap.get(row.speakerId) ?? { totalScore: 0, appearances: 0, roundScores: [] };
    existing.roundScores.push({
      roundId: row.roundId,
      score: row.score,
      status: row.status,
    });
    existing.totalScore += row.score;
    existing.appearances += 1;
    standingMap.set(row.speakerId, existing);
  }

  const ranked = [...standingMap.entries()]
    .map(([speakerId, data]) => ({
      speakerId,
      totalScore: data.totalScore,
      appearances: data.appearances,
      averageScore: data.appearances ? Number((data.totalScore / data.appearances).toFixed(2)) : 0,
      roundScores: data.roundScores.sort((a, b) => a.roundId - b.roundId),
    }))
    .sort((a, b) => {
      if (b.totalScore !== a.totalScore) return b.totalScore - a.totalScore;
      if (b.averageScore !== a.averageScore) return b.averageScore - a.averageScore;
      return a.speakerId - b.speakerId;
    });

  await db.delete(standingsPS).where(eq(standingsPS.tabId, tabId));

  if (!ranked.length) return;

  let currentRank = 1;
  const standingsValues = ranked.map((entry, index) => {
    if (
      index > 0 &&
      (entry.totalScore < ranked[index - 1].totalScore ||
        entry.averageScore < ranked[index - 1].averageScore)
    ) {
      currentRank = index + 1;
    }

    return {
      tabId,
      speakerId: entry.speakerId,
      totalScore: entry.totalScore,
      averageScore: entry.averageScore,
      appearances: entry.appearances,
      roundScores: JSON.stringify(entry.roundScores),
      rank: currentRank,
    };
  });

  await db.insert(standingsPS).values(standingsValues);
}

export async function ballot(req: Request, res: Response) {
  try {
    const { tabId, roomId, roundId, speakerId, status, score } = req.body as {
      tabId?: string;
      roomId?: number;
      roundId?: number;
      speakerId?: number;
      status?: ResultStatus;
      score?: number;
    };

    if (!tabId || !roomId || !roundId || !speakerId) {
      return res.status(400).json({ message: 'Specify tab, room, round and speaker' });
    }

    const round = await getRoundContext(tabId, roundId);
    if (!round) {
      return res.status(404).json({ message: 'Round not found in this tab' });
    }
    if (round.completed) {
      return res.status(400).json({ message: 'This round has been marked as completed on tab' });
    }

    const validated = validateResultInput({
      score,
      status,
      minScore: round.minScore,
      maxScore: round.maxScore,
      breaks: round.breaks,
    });
    if (!validated.ok) {
      return res.status(400).json({ message: validated.message });
    }

    const drawRows = await db
      .select({ drawId: drawsPS.drawId })
      .from(drawsPS)
      .where(and(eq(drawsPS.roomId, roomId), eq(drawsPS.roundId, roundId), eq(drawsPS.tabId, tabId)))
      .limit(1);
    if (!drawRows.length) {
      return res.status(400).json({ message: "This draw doesn't exist" });
    }

    const drawSpeakerRows = await db
      .select({ id: drawSpeakersPS.id })
      .from(drawSpeakersPS)
      .where(and(eq(drawSpeakersPS.drawId, drawRows[0].drawId), eq(drawSpeakersPS.speakerId, speakerId)))
      .limit(1);
    if (!drawSpeakerRows.length) {
      return res.status(400).json({ message: "This speaker wasn't in draw" });
    }

    const resultRows = await db
      .select({
        resultId: resultsPS.resultId,
      })
      .from(resultsPS)
      .where(eq(resultsPS.drawSpeakerId, drawSpeakerRows[0].id))
      .limit(1);

    if (!resultRows.length) {
      const newResult = await db
        .insert(resultsPS)
        .values({
          drawSpeakerId: drawSpeakerRows[0].id,
          score: validated.score,
          status: validated.status,
        })
        .returning({
          resultId: resultsPS.resultId,
          drawSpeakerId: resultsPS.drawSpeakerId,
          score: resultsPS.score,
          status: resultsPS.status,
          createdAt: resultsPS.createdAt,
          updatedAt: resultsPS.updatedAt,
        });

      await rebuildStandingsForTab(tabId);

      return res.status(200).json({
        message: 'Result added',
        data: newResult[0],
      });
    }

    const updatedResult = await db
      .update(resultsPS)
      .set({
        score: validated.score,
        status: validated.status,
      })
      .where(eq(resultsPS.resultId, resultRows[0].resultId))
      .returning({
        resultId: resultsPS.resultId,
        drawSpeakerId: resultsPS.drawSpeakerId,
        score: resultsPS.score,
        status: resultsPS.status,
        createdAt: resultsPS.createdAt,
        updatedAt: resultsPS.updatedAt,
      });

    await rebuildStandingsForTab(tabId);

    return res.status(200).json({
      message: 'Result updated',
      data: updatedResult[0],
    });
  } catch (error) {
    console.error('ps ballot error:', error);
    return res.status(500).json({ message: 'failed to update result' });
  }
}

export async function batchBallot(req: Request, res: Response) {
  try {
    const { tabId, roundId, roomId, updates } = req.body as {
      tabId?: string;
      roundId?: number;
      roomId?: number;
      updates?: Array<{
        speakerId: number;
        score?: number;
        status?: ResultStatus;
      }>;
    };

    if (!tabId || !roundId || !roomId || !Array.isArray(updates) || !updates.length) {
      return res.status(400).json({ message: 'tabId, roundId, roomId and updates are required' });
    }

    const round = await getRoundContext(tabId, roundId);
    if (!round) {
      return res.status(404).json({ message: 'Round not found in this tab' });
    }
    if (round.completed) {
      return res.status(400).json({ message: 'This round has been marked as completed on tab' });
    }

    for (const item of updates) {
      if (!item.speakerId) {
        return res.status(400).json({ message: 'Each update must include speakerId' });
      }
      const validated = validateResultInput({
        score: item.score,
        status: item.status,
        minScore: round.minScore,
        maxScore: round.maxScore,
        breaks: round.breaks,
      });
      if (!validated.ok) {
        return res.status(400).json({ message: `Speaker ${item.speakerId}: ${validated.message}` });
      }
    }

    const drawRows = await db
      .select({ drawId: drawsPS.drawId })
      .from(drawsPS)
      .where(and(eq(drawsPS.tabId, tabId), eq(drawsPS.roundId, roundId), eq(drawsPS.roomId, roomId)))
      .limit(1);

    if (!drawRows.length) {
      return res.status(404).json({ message: 'Draw not found for this room and round' });
    }

    const requestedSpeakerIds = updates.map((u) => u.speakerId);
    const drawSpeakerRows = await db
      .select({
        drawSpeakerId: drawSpeakersPS.id,
        speakerId: drawSpeakersPS.speakerId,
      })
      .from(drawSpeakersPS)
      .where(
        and(
          eq(drawSpeakersPS.tabId, tabId),
          eq(drawSpeakersPS.drawId, drawRows[0].drawId),
          inArray(drawSpeakersPS.speakerId, requestedSpeakerIds)
        )
      );

    if (drawSpeakerRows.length !== requestedSpeakerIds.length) {
      return res.status(400).json({ message: 'One or more speakers are not in this draw' });
    }

    const drawSpeakerIdBySpeakerId = new Map(drawSpeakerRows.map((row) => [row.speakerId, row.drawSpeakerId]));
    const drawSpeakerIds = drawSpeakerRows.map((row) => row.drawSpeakerId);

    const existingResults = await db
      .select({
        resultId: resultsPS.resultId,
        drawSpeakerId: resultsPS.drawSpeakerId,
      })
      .from(resultsPS)
      .where(inArray(resultsPS.drawSpeakerId, drawSpeakerIds));

    const resultIdByDrawSpeakerId = new Map(existingResults.map((row) => [row.drawSpeakerId, row.resultId]));

    const savedResults = await db.transaction(async (tx) => {
      const rows = [];

      for (const item of updates) {
        const validated = validateResultInput({
          score: item.score,
          status: item.status,
          minScore: round.minScore,
          maxScore: round.maxScore,
          breaks: round.breaks,
        });
        if (!validated.ok) {
          throw new Error(validated.message);
        }

        const drawSpeakerId = drawSpeakerIdBySpeakerId.get(item.speakerId)!;
        const existingResultId = resultIdByDrawSpeakerId.get(drawSpeakerId);
        const values = {
          score: validated.score,
          status: validated.status,
        };

        if (existingResultId) {
          const updated = await tx
            .update(resultsPS)
            .set(values)
            .where(eq(resultsPS.resultId, existingResultId))
            .returning({
              resultId: resultsPS.resultId,
              drawSpeakerId: resultsPS.drawSpeakerId,
              score: resultsPS.score,
              status: resultsPS.status,
              updatedAt: resultsPS.updatedAt,
            });

          rows.push(updated[0]);
        } else {
          const inserted = await tx
            .insert(resultsPS)
            .values({
              drawSpeakerId,
              ...values,
            })
            .returning({
              resultId: resultsPS.resultId,
              drawSpeakerId: resultsPS.drawSpeakerId,
              score: resultsPS.score,
              status: resultsPS.status,
              createdAt: resultsPS.createdAt,
              updatedAt: resultsPS.updatedAt,
            });

          rows.push(inserted[0]);
        }
      }

      return rows;
    });

    await rebuildStandingsForTab(tabId);

    return res.status(200).json({
      message: 'Batch results saved',
      data: savedResults,
    });
  } catch (error) {
    console.error('ps batchBallot error:', error);
    const message = error instanceof Error ? error.message : 'Failed to save batch results';
    return res.status(500).json({ message });
  }
}

export async function deleteBallot(req: Request, res: Response) {
  try {
    const { tabId, roundId, roomId, speakerId } = req.body as {
      tabId?: string;
      roundId?: number;
      roomId?: number;
      speakerId?: number;
    };

    if (!tabId || !roundId || !roomId || !speakerId) {
      return res.status(400).json({ message: 'specify tab, round, room and speaker' });
    }

    const round = await getRoundContext(tabId, roundId);
    if (!round) {
      return res.status(404).json({ message: 'Round not found in this tab' });
    }
    if (round.completed) {
      return res.status(400).json({ message: 'This round has been marked as completed on tab' });
    }

    const drawRows = await db
      .select({ drawId: drawsPS.drawId })
      .from(drawsPS)
      .where(and(eq(drawsPS.tabId, tabId), eq(drawsPS.roundId, roundId), eq(drawsPS.roomId, roomId)))
      .limit(1);
    if (!drawRows.length) {
      return res.status(404).json({ message: 'draw not found' });
    }

    const drawSpeakerRows = await db
      .select({ drawSpeakerId: drawSpeakersPS.id })
      .from(drawSpeakersPS)
      .where(and(eq(drawSpeakersPS.drawId, drawRows[0].drawId), eq(drawSpeakersPS.speakerId, speakerId), eq(drawSpeakersPS.tabId, tabId)))
      .limit(1);
    if (!drawSpeakerRows.length) {
      return res.status(404).json({ message: "speaker wasn't in draw" });
    }

    const deleted = await db
      .delete(resultsPS)
      .where(eq(resultsPS.drawSpeakerId, drawSpeakerRows[0].drawSpeakerId))
      .returning({
        resultId: resultsPS.resultId,
      });

    if (!deleted.length) {
      return res.status(404).json({ message: 'Result not deleted' });
    }

    await rebuildStandingsForTab(tabId);

    return res.status(200).json({
      message: 'result deleted successfully',
      data: deleted[0],
    });
  } catch (error) {
    console.error('ps deleteBallot error:', error);
    return res.status(500).json({ message: 'failed to delete result' });
  }
}
