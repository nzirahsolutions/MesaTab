import { Request, Response } from 'express';
import { and, asc, eq, inArray } from 'drizzle-orm';
import { db } from '../../db/db';
import {
  cupCategoriesPS,
  drawsPS,
  drawJudgesPS,
  drawSpeakersPS,
  judgesPS,
  resultsPS,
  roomsPS,
  roundsPS,
  speakersPS,
  standingsPS,
  tabsPS
} from '../../db/schema';
import { rebuildStandingsForTab } from './ps.results.controller';

type AllocatedSpeaker = { speakerId: number; institutionId: number };
type RoomAllocation = { roomId: number; allocatedSpeakers: AllocatedSpeaker[] };

function shuffle<T>(array: T[]): T[] {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function allocateSlidingPowerPair<T>(rooms: Array<{ roomId: number }>, rankedItems: T[]): Array<{ roomId: number; allocatedSpeakers: T[] }> {
  if (!rooms.length || !rankedItems.length) return [];

  const basePerRoom = Math.floor(rankedItems.length / rooms.length);
  const extra = rankedItems.length % rooms.length;
  const capacities = rooms.map((_, index) => basePerRoom + (index < extra ? 1 : 0));
  const allocations = rooms.map((room) => ({ roomId: room.roomId, allocatedSpeakers: [] as T[] }));

  let direction = 1;
  let roomIndex = 0;

  for (const item of rankedItems) {
    while (capacities[roomIndex] === 0) {
      if (direction === 1) {
        if (roomIndex === rooms.length - 1) {
          direction = -1;
        } else {
          roomIndex += 1;
        }
      } else if (roomIndex === 0) {
        direction = 1;
      } else {
        roomIndex -= 1;
      }
    }

    allocations[roomIndex].allocatedSpeakers.push(item);
    capacities[roomIndex] -= 1;

    if (direction === 1) {
      if (roomIndex === rooms.length - 1) {
        direction = -1;
      } else {
        roomIndex += 1;
      }
    } else if (roomIndex === 0) {
      direction = 1;
    } else {
      roomIndex -= 1;
    }
  }

  return allocations.filter((room) => room.allocatedSpeakers.length > 0);
}

function allocateJudgesToRooms(
  judges: Array<{ judgeId: number; institutionId: number }>,
  roomAllocations: Array<{ roomId: number; allocatedSpeakers: Array<{ institutionId: number }> }>
) {
  const availableJudges = shuffle(judges);
  const baseJudgesPerRoom = Math.floor(availableJudges.length / roomAllocations.length);
  const extraJudges = availableJudges.length % roomAllocations.length;
  let judgeCursor = 0;

  const judgeAllocations = roomAllocations.map((allocation, index) => {
    const size = baseJudgesPerRoom + (index < extraJudges ? 1 : 0);
    const speakerInstitutions = new Set(allocation.allocatedSpeakers.map((speaker) => speaker.institutionId));
    const chunk = availableJudges.slice(judgeCursor, judgeCursor + size);
    judgeCursor += size;

    const noConflict = chunk.filter((judge) => !speakerInstitutions.has(judge.institutionId));
    const conflict = chunk.filter((judge) => speakerInstitutions.has(judge.institutionId));

    return {
      roomId: allocation.roomId,
      judgeIds: [...noConflict, ...conflict].map((judge) => judge.judgeId),
    };
  });

  return new Map(judgeAllocations.map((entry) => [entry.roomId, entry.judgeIds]));
}

async function replaceExistingDrawsForRound(tx: any, tabId: string, roundId: number) {
  const existingDraws = await tx
    .select({ drawId: drawsPS.drawId })
    .from(drawsPS)
    .where(and(eq(drawsPS.tabId, tabId), eq(drawsPS.roundId, roundId)));

  const drawIds = existingDraws.map((row: { drawId: number }) => row.drawId);
  if (!drawIds.length) return;

  await tx.delete(drawsPS).where(inArray(drawsPS.drawId, drawIds));
}

async function createDrawsForRound(
  tx: any,
  params: {
    tabId: string;
    roundId: number;
    roomAllocations: RoomAllocation[];
    judges: Array<{ judgeId: number; institutionId: number }>;
  }
) {
  await replaceExistingDrawsForRound(tx, params.tabId, params.roundId);

  const judgeByRoom = allocateJudgesToRooms(params.judges, params.roomAllocations);
  const created: Array<{ drawId: number; roomId: number; speakerIds: number[]; judgeIds: number[] }> = [];

  for (const allocation of params.roomAllocations) {
    const [draw] = await tx
      .insert(drawsPS)
      .values({
        tabId: params.tabId,
        roundId: params.roundId,
        roomId: allocation.roomId,
      })
      .returning({
        drawId: drawsPS.drawId,
        roomId: drawsPS.roomId,
      });

    await tx.insert(drawSpeakersPS).values(
      allocation.allocatedSpeakers.map((speaker) => ({
        tabId: params.tabId,
        drawId: draw.drawId,
        roomId: allocation.roomId,
        speakerId: speaker.speakerId,
      }))
    );

    const roomJudgeIds = judgeByRoom.get(allocation.roomId) ?? [];
    if (roomJudgeIds.length) {
      await tx.insert(drawJudgesPS).values(
        roomJudgeIds.map((judgeId) => ({
          tabId: params.tabId,
          drawId: draw.drawId,
          roomId: allocation.roomId,
          judgeId,
        }))
      );
    }

    created.push({
      drawId: draw.drawId,
      roomId: allocation.roomId,
      speakerIds: allocation.allocatedSpeakers.map((speaker) => speaker.speakerId),
      judgeIds: roomJudgeIds,
    });
  }

  return created;
}

async function getTargetBreakRound(tabId: string, roundId: number) {
  const rows = await db
    .select({
      roundId: roundsPS.roundId,
      name: roundsPS.name,
      number: roundsPS.number,
      breakPhase: roundsPS.breakPhase,
      cupCategoryId: roundsPS.cupCategoryId,
      breaks: roundsPS.breaks,
      completed: roundsPS.completed,
      speechDuration: roundsPS.speechDuration,
    })
    .from(roundsPS)
    .where(and(eq(roundsPS.tabId, tabId), eq(roundsPS.roundId, roundId)))
    .limit(1);

  return rows[0] ?? null;
}

async function getBreakRoundPlan(tabId: string, roundId: number) {
  const targetRound = await getTargetBreakRound(tabId, roundId);
  if (!targetRound) {
    return { error: { status: 404, message: 'Round not found in this tab' } };
  }
  if (targetRound.completed) {
    return { error: { status: 400, message: 'This break round has already been marked as completed' } };
  }
  if (!targetRound.breaks || !targetRound.cupCategoryId) {
    return { error: { status: 400, message: 'Selected round is not a valid break round' } };
  }

  const [allCupRows, cupRoundRows, rooms] = await Promise.all([
    db
      .select({
        id: cupCategoriesPS.cupCategoryId,
        cupCategory: cupCategoriesPS.cupCategory,
        breakCapacity: cupCategoriesPS.breakCapacity,
        breakNumber: cupCategoriesPS.breakNumber,
        cupOrder: cupCategoriesPS.cupOrder,
      })
      .from(cupCategoriesPS)
      .where(eq(cupCategoriesPS.tabId, tabId))
      .orderBy(asc(cupCategoriesPS.cupOrder), asc(cupCategoriesPS.cupCategoryId)),
    db
      .select({
        roundId: roundsPS.roundId,
        name: roundsPS.name,
        number: roundsPS.number,
        cupCategoryId: roundsPS.cupCategoryId,
      })
      .from(roundsPS)
      .where(and(eq(roundsPS.tabId, tabId), eq(roundsPS.breaks, true)))
      .orderBy(asc(roundsPS.number), asc(roundsPS.roundId)),
    db
      .select({
        roomId: roomsPS.roomId,
        name: roomsPS.name,
      })
      .from(roomsPS)
      .where(and(eq(roomsPS.tabId, tabId), eq(roomsPS.available, true)))
      .orderBy(asc(roomsPS.roomId)),
  ]);

  const cup = allCupRows.find((entry) => entry.id === targetRound.cupCategoryId);
  if (!cup) {
    return { error: { status: 404, message: 'Cup configuration for this round was not found' } };
  }

  const cupRounds = cupRoundRows.filter((entry) => entry.cupCategoryId === targetRound.cupCategoryId);
  const roundIndex = cupRounds.findIndex((entry) => entry.roundId === targetRound.roundId);
  if (roundIndex === -1) {
    return { error: { status: 404, message: 'Break round configuration is missing for this cup' } };
  }

  if (roundIndex === 0) {
    const prelimRounds = await db
      .select({
        roundId: roundsPS.roundId,
        name: roundsPS.name,
        completed: roundsPS.completed,
      })
      .from(roundsPS)
      .where(and(eq(roundsPS.tabId, tabId), eq(roundsPS.breaks, false)))
      .orderBy(asc(roundsPS.number), asc(roundsPS.roundId));

    const incompletePrelims = prelimRounds.filter((round) => !round.completed);
    if (incompletePrelims.length) {
      return {
        error: {
          status: 400,
          message: `Preliminary rounds incomplete: ${incompletePrelims.map((round) => round.name).join(', ')}`,
        },
      };
    }

    const standings = await db
      .select({
        speakerId: standingsPS.speakerId,
        institutionId: speakersPS.institutionId,
        rank: standingsPS.rank,
      })
      .from(standingsPS)
      .innerJoin(speakersPS, eq(standingsPS.speakerId, speakersPS.speakerId))
      .where(and(eq(standingsPS.tabId, tabId), eq(speakersPS.available, true)))
      .orderBy(asc(standingsPS.rank), asc(standingsPS.speakerId));

    if (!standings.length) {
      return { error: { status: 400, message: 'No ranked speakers available' } };
    }
    if (!rooms.length) {
      return { error: { status: 400, message: 'No rooms available for this tab' } };
    }

    const remainingSpeakers = [...standings];
    let roomCursor = 0;
    const warnings: string[] = [];
    const plans = new Map<number, { allocations: RoomAllocation[]; warnings: string[]; cupCategory: string | null }>();

    for (const cupEntry of allCupRows) {
      const requestedRooms = cupEntry.breakNumber;
      const assignedRooms = Math.min(requestedRooms, Math.max(0, rooms.length - roomCursor));
      const selectedRooms = rooms.slice(roomCursor, roomCursor + assignedRooms);
      roomCursor += assignedRooms;

      if (assignedRooms < requestedRooms) {
        warnings.push(`${cupEntry.cupCategory}: requested ${requestedRooms} rooms, found ${assignedRooms}`);
      }

      const maxSpeakers = assignedRooms * cupEntry.breakCapacity;
      const selectedSpeakers = remainingSpeakers.splice(0, maxSpeakers);
      const allocations = allocateSlidingPowerPair(
        selectedRooms.map((room) => ({ roomId: room.roomId })),
        selectedSpeakers.map((speaker) => ({
          speakerId: speaker.speakerId,
          institutionId: speaker.institutionId,
        }))
      ).map((allocation) => ({
        roomId: allocation.roomId,
        allocatedSpeakers: allocation.allocatedSpeakers,
      }));

      plans.set(cupEntry.id, {
        allocations,
        warnings: [...warnings],
        cupCategory: cupEntry.cupCategory,
      });
    }

    return {
      plan: {
        targetRound,
        cup,
        firstRound: true,
        allocations: plans.get(cup.id)?.allocations ?? [],
        warnings: plans.get(cup.id)?.warnings ?? warnings,
      },
    };
  }

  const previousRound = cupRounds[roundIndex - 1];
  const previousParticipants = await db
    .select({
      speakerId: drawSpeakersPS.speakerId,
      institutionId: speakersPS.institutionId,
      status: resultsPS.status,
    })
    .from(drawsPS)
    .innerJoin(drawSpeakersPS, eq(drawSpeakersPS.drawId, drawsPS.drawId))
    .innerJoin(speakersPS, eq(speakersPS.speakerId, drawSpeakersPS.speakerId))
    .leftJoin(resultsPS, eq(resultsPS.drawSpeakerId, drawSpeakersPS.id))
    .where(and(eq(drawsPS.tabId, tabId), eq(drawsPS.roundId, previousRound.roundId), eq(speakersPS.available, true)))
    .orderBy(asc(drawsPS.roomId), asc(drawSpeakersPS.id));

  if (!previousParticipants.length) {
    return { error: { status: 400, message: `No draw exists yet for ${previousRound.name}` } };
  }

  if (previousParticipants.some((row) => !row.status || row.status === 'Incomplete')) {
    return { error: { status: 400, message: 'Previous round incomplete' } };
  }

  const passedSpeakers = previousParticipants
    .filter((row) => row.status === 'Pass')
    .map((row) => ({
      speakerId: row.speakerId,
      institutionId: row.institutionId,
    }));

  if (!passedSpeakers.length) {
    return { error: { status: 400, message: 'No speaker has been marked as passed from previous round' } };
  }

  if (!rooms.length) {
    return { error: { status: 400, message: 'No rooms available for this tab' } };
  }

  const requestedRooms = Math.max(1, Math.ceil(passedSpeakers.length / cup.breakCapacity));
  const assignedRooms = Math.min(requestedRooms, rooms.length);
  const selectedRooms = rooms.slice(0, assignedRooms);
  const warnings =
    assignedRooms < requestedRooms
      ? [`${targetRound.name}: requested ${requestedRooms} rooms, found ${assignedRooms}`]
      : [];

  const allocations = allocateSlidingPowerPair(
    selectedRooms.map((room) => ({ roomId: room.roomId })),
    passedSpeakers.slice(0, assignedRooms * cup.breakCapacity)
  ).map((allocation) => ({
    roomId: allocation.roomId,
    allocatedSpeakers: allocation.allocatedSpeakers,
  }));

  return {
    plan: {
      targetRound,
      cup,
      firstRound: false,
      previousRound,
      allocations,
      warnings,
    },
  };
}

export async function generateDraw(req: Request, res: Response) {
  try {
    const { roundId, tabId, powerPair } = req.body as {
      roundId?: number;
      tabId?: string;
      powerPair?: boolean;
    };

    if (!roundId || !tabId) {
      return res.status(400).json({ message: 'Tab Id and round required' });
    }

    const roundRows = await db
      .select({
        roundId: roundsPS.roundId,
        completed: roundsPS.completed,
      })
      .from(roundsPS)
      .where(and(eq(roundsPS.tabId, tabId), eq(roundsPS.roundId, roundId)))
      .limit(1);

    if (!roundRows.length) {
      return res.status(404).json({ message: 'Round not found in this tab' });
    }
    if (roundRows[0].completed) {
      return res.status(400).json({ message: 'This round has been marked as completed on tab' });
    }

    const [rooms, speakers, judges] = await Promise.all([
      db
        .select({
          roomId: roomsPS.roomId,
          name: roomsPS.name,
        })
        .from(roomsPS)
        .where(and(eq(roomsPS.tabId, tabId), eq(roomsPS.available, true)))
        .orderBy(asc(roomsPS.roomId)),
      db
        .select({
          speakerId: speakersPS.speakerId,
          institutionId: speakersPS.institutionId,
        })
        .from(speakersPS)
        .where(and(eq(speakersPS.tabId, tabId), eq(speakersPS.available, true))),
      db
        .select({
          judgeId: judgesPS.judgeId,
          institutionId: judgesPS.institutionId,
        })
        .from(judgesPS)
        .where(and(eq(judgesPS.tabId, tabId), eq(judgesPS.available, true))),
    ]);

    if (!rooms.length) return res.status(400).json({ message: 'No rooms found for this tab' });
    if (!speakers.length) return res.status(400).json({ message: 'No speakers available for this tab' });
    if (!judges.length) return res.status(400).json({ message: 'No judges available in this tab' });

    let orderedSpeakers = shuffle(speakers);
    if (powerPair) {
      const standings = await db
        .select({
          speakerId: standingsPS.speakerId,
          rank: standingsPS.rank,
        })
        .from(standingsPS)
        .where(eq(standingsPS.tabId, tabId))
        .orderBy(asc(standingsPS.rank), asc(standingsPS.speakerId));

      if (standings.length) {
        const speakerById = new Map(speakers.map((speaker) => [speaker.speakerId, speaker] as const));
        const rankedSpeakers: typeof speakers = [];
        const rankedIds = new Set<number>();

        for (const standing of standings) {
          const speaker = speakerById.get(standing.speakerId);
          if (speaker) {
            rankedSpeakers.push(speaker);
            rankedIds.add(speaker.speakerId);
          }
        }

        for (const speaker of speakers) {
          if (!rankedIds.has(speaker.speakerId)) rankedSpeakers.push(speaker);
        }

        orderedSpeakers = rankedSpeakers;
      }
    }

    const roomAllocations = powerPair
      ? allocateSlidingPowerPair(rooms, orderedSpeakers).map((allocation) => ({
          roomId: allocation.roomId,
          allocatedSpeakers: allocation.allocatedSpeakers,
        }))
      : (() => {
          const basePerRoom = Math.floor(orderedSpeakers.length / rooms.length);
          const extra = orderedSpeakers.length % rooms.length;
          let cursor = 0;
          return rooms
            .map((room, index) => {
              const size = basePerRoom + (index < extra ? 1 : 0);
              const allocatedSpeakers = orderedSpeakers.slice(cursor, cursor + size);
              cursor += size;
              return { roomId: room.roomId, allocatedSpeakers };
            })
            .filter((allocation) => allocation.allocatedSpeakers.length > 0);
        })();

    const created = await db.transaction(async (tx) =>
      createDrawsForRound(tx, {
        tabId,
        roundId,
        roomAllocations,
        judges,
      })
    );

    return res.status(201).json({
      message: 'Draw generated successfully',
      data: {
        tabId,
        roundId,
        draws: created,
      },
    });
  } catch (error) {
    console.error('ps generateDraw error:', error);
    return res.status(500).json({ message: 'failed to generate draw' });
  }
}

export async function generateBreaks(req: Request, res: Response) {
  try {
    const { tabId, roundId } = req.body as {
      tabId?: string;
      roundId?: number;
    };

    if (!tabId || !roundId) {
      return res.status(400).json({ message: 'tabId and roundId are required' });
    }

    const preview = await getBreakRoundPlan(tabId, roundId);
    if ('error' in preview && preview.error) {
      return res.status(preview.error.status).json({ message: preview.error.message });
    }

    return res.status(200).json({
      message: 'Break preview generated successfully',
      data: preview.plan,
    });
  } catch (error) {
    console.error('ps generateBreaks error:', error);
    return res.status(500).json({ message: 'failed to generate break preview' });
  }
}

export async function generateBreakDraw(req: Request, res: Response) {
  try {
    const { tabId, roundId } = req.body as {
      tabId?: string;
      roundId?: number;
    };

    if (!tabId || !roundId) {
      return res.status(400).json({ message: 'tabId and roundId are required' });
    }

    const preview = await getBreakRoundPlan(tabId, roundId);
    if ('error' in preview && preview.error) {
      return res.status(preview.error.status).json({ message: preview.error.message });
    }

    const [judges] = await Promise.all([
      db
        .select({
          judgeId: judgesPS.judgeId,
          institutionId: judgesPS.institutionId,
        })
        .from(judgesPS)
        .where(and(eq(judgesPS.tabId, tabId), eq(judgesPS.available, true))),
    ]);

    if (!judges.length) {
      return res.status(400).json({ message: 'No judges available in this tab' });
    }

    const created = await db.transaction(async (tx) =>
      createDrawsForRound(tx, {
        tabId,
        roundId,
        roomAllocations: preview.plan.allocations,
        judges,
      })
    );

    return res.status(201).json({
      message: 'Break draws generated successfully',
      data: {
        roundId,
        warnings: preview.plan.warnings,
        draws: created,
      },
    });
  } catch (error) {
    console.error('ps generateBreakDraw error:', error);
    return res.status(500).json({ message: 'failed to generate break draw' });
  }
}

export async function deleteDraw(req: Request, res: Response) {
  try {
    const { roundId, tabId } = req.body as {
      roundId?: number;
      tabId?: string;
    };

    if (!roundId || !tabId) {
      return res.status(400).json({ message: 'Round and tabId are required' });
    }

    const roundRows = await db
      .select({
        roundId: roundsPS.roundId,
        completed: roundsPS.completed,
      })
      .from(roundsPS)
      .where(and(eq(roundsPS.tabId, tabId), eq(roundsPS.roundId, roundId)))
      .limit(1);

    if (!roundRows.length) {
      return res.status(404).json({ message: 'Round not found in this tab' });
    }
    if (roundRows[0].completed) {
      return res.status(400).json({ message: 'Cannot delete draw for a completed round' });
    }

    const existing = await db
      .select({
        drawId: drawsPS.drawId,
      })
      .from(drawsPS)
      .where(and(eq(drawsPS.tabId, tabId), eq(drawsPS.roundId, roundId)));

    if (!existing.length) {
      return res.status(404).json({ message: 'No draw for this round in tab' });
    }

    await db.delete(drawsPS).where(inArray(drawsPS.drawId, existing.map((draw) => draw.drawId)));
    await rebuildStandingsForTab(tabId);

    return res.status(200).json({
      message: 'Draw deleted successfully',
    });
  } catch (error) {
    console.error('ps deleteDraw error:', error);
    return res.status(500).json({ message: 'failed to delete draw' });
  }
}

export async function updateDraw(req: Request, res: Response){
  try {
    const {roundId, room1, room2, swapState, judge1, judge2, speaker1, speaker2, tabId}=req.body as{
      roundId: number;
      room1: number;
      room2: number;
      swapState: number;
      judge1: number;
      judge2: number;
      speaker1: number;
      speaker2: number;
      tabId:string;
    }
    if(swapState!==5 && swapState!==6 && swapState!==7 && swapState!==8 && (!roundId || room1==0 || room2===0 || swapState===0 || !tabId))
        return res.status(400).json({message:'Must select rounds, rooms and update operation'});
    if(swapState!==5 && swapState!==6 && room1===room2)
        return res.status(400).json({message:'Select different rooms'});
    if(swapState===1 && (!speaker1 || !speaker2))
        return res.status(400).json({message:'Select two speakers to swap'});
    if(swapState===2 && (!judge1 || !judge2))
        return res.status(400).json({message:'Select two judges to swap'});
    if(swapState===3 && !speaker1)
        return res.status(400).json({message:'Select speaker to move'});
    if(swapState===4 && !judge1)
        return res.status(400).json({message:'Select judge to move'});
    if(swapState===5 && (!speaker1 || room1==0))
        return res.status(400).json({message:`Select speaker and room to add`});
    if(swapState===6 && (!judge1 || room1==0))
        return res.status(400).json({message:'Select judge and room to add'});
    if(swapState===7 && (room2==0 || room1==0))
        return res.status(400).json({message:'Select rooms to swap'});
    if(swapState===8 && (room2==0 || room1==0))
        return res.status(400).json({message:'Select rooms to move from and to'});

    //confirm tab isn't completed
    const [tab]= await db
      .select({completed: tabsPS.completed})
      .from(tabsPS)
      .where(eq(tabsPS.tabId, tabId));
    
    if(tab.completed) return res.status(400).json({message:'Tab marked as completed'});
    
    //confirm round exists in tab
    const [round] = await db
      .select({
        roundId: roundsPS.roundId,
        tabId: roundsPS.tabId,
        name: roundsPS.name,
        breaks: roundsPS.breaks,
        completed: roundsPS.completed,
      })
      .from(roundsPS)
      .where(and(eq(roundsPS.tabId, tabId), eq(roundsPS.roundId, roundId)))
      .limit(1);
    if (!round) {
      return res.status(404).json({ message: "Round not found in this tab" });
    }

    //prevent redraw of completed rounds
    if(round.completed)
      return res.status(400).json({message: 'This round has been marked as completed on tab'});

    //swap speakers
    if(swapState===1){
      const updated = await db.transaction(async (tx) => {
        const [draw1] = await tx
          .select({ drawId: drawsPS.drawId,  })
          .from(drawsPS)
          .where(and(
            eq(drawsPS.tabId, tabId), 
            eq(drawsPS.roundId, roundId), 
            eq(drawsPS.roomId, room1)))
          .limit(1);
        
        const [draw2] = await tx
          .select({ drawId: drawsPS.drawId })
          .from(drawsPS)
          .where(and(
            eq(drawsPS.tabId, tabId), 
            eq(drawsPS.roundId, roundId), 
            eq(drawsPS.roomId, room2)))
          .limit(1);

        if(!draw1 ||!draw2)
          throw new Error('Rooms had no draws in this round');

        //find speakers in drawspeakersps
        const [s1InDraw1] = await tx
          .select({ id: drawSpeakersPS.id })
          .from(drawSpeakersPS)
          .where(
            and(
              eq(drawSpeakersPS.tabId, tabId),
              eq(drawSpeakersPS.drawId, draw1.drawId),
              eq(drawSpeakersPS.roomId, room1),
              eq(drawSpeakersPS.speakerId, speaker1)
            )
          )
          .limit(1);

        const [s2InDraw2] = await tx
          .select({ id: drawSpeakersPS.id })
          .from(drawSpeakersPS)
          .where(
            and(
              eq(drawSpeakersPS.tabId, tabId),
              eq(drawSpeakersPS.drawId, draw2.drawId),
              eq(drawSpeakersPS.roomId, room2),
              eq(drawSpeakersPS.speakerId, speaker2)
            )
          )
          .limit(1);

        if (!s1InDraw1 || !s2InDraw2) {
          throw new Error("One or both speakers are not in the selected rooms");
        }
        
        // delete speaker draws;
        await tx
          .delete(drawSpeakersPS)
          .where(
            and(
              eq(drawSpeakersPS.tabId, tabId),
              eq(drawSpeakersPS.drawId, draw1.drawId),
              eq(drawSpeakersPS.roomId, room1),
              eq(drawSpeakersPS.speakerId, speaker1)
            )
          );
        await tx
          .delete(drawSpeakersPS)
          .where(
            and(
              eq(drawSpeakersPS.tabId, tabId),
              eq(drawSpeakersPS.drawId, draw2.drawId),
              eq(drawSpeakersPS.roomId, room2),
              eq(drawSpeakersPS.speakerId, speaker2)
            )
          );

          //insert new speaker draws
        await tx.insert(drawSpeakersPS).values({
          tabId,
          drawId: draw1.drawId,
          roomId: room1,
          speakerId: speaker2,
        });

        await tx.insert(drawSpeakersPS).values({
          tabId,
          drawId: draw2.drawId,
          roomId: room2,
          speakerId: speaker1,
        });

        return {
          roundId,
          room1,
          room2,
          speaker1MovedTo: room2,
          speaker2MovedTo: room1,
        };

      });
      return res.status(201).json({
      message: "Speakerrs swapped successfully",
      data: updated,
      });
    }
    //swap judges
    if(swapState===2){
      const updated = await db.transaction(async (tx) => {
        const [draw1] = await tx
          .select({ drawId: drawsPS.drawId,  })
          .from(drawsPS)
          .where(and(
            eq(drawsPS.tabId, tabId), 
            eq(drawsPS.roundId, roundId), 
            eq(drawsPS.roomId, room1)))
          .limit(1);
        
        const [draw2] = await tx
          .select({ drawId: drawsPS.drawId })
          .from(drawsPS)
          .where(and(
            eq(drawsPS.tabId, tabId), 
            eq(drawsPS.roundId, roundId), 
            eq(drawsPS.roomId, room2)))
          .limit(1);

        if(!draw1 ||!draw2)
          throw new Error('Rooms had no draws in this round');

        //find judges in drawspeakersps
        const [j1InDraw1] = await tx
          .select({ id: drawJudgesPS.id })
          .from(drawJudgesPS)
          .where(
            and(
              eq(drawJudgesPS.tabId, tabId),
              eq(drawJudgesPS.drawId, draw1.drawId),
              eq(drawJudgesPS.roomId, room1),
              eq(drawJudgesPS.judgeId, judge1)
            )
          )
          .limit(1);

        const [j2InDraw2] = await tx
          .select({ id: drawJudgesPS.id })
          .from(drawJudgesPS)
          .where(
            and(
              eq(drawJudgesPS.tabId, tabId),
              eq(drawJudgesPS.drawId, draw2.drawId),
              eq(drawJudgesPS.roomId, room2),
              eq(drawJudgesPS.judgeId, judge2)
            )
          )
          .limit(1);

        if (!j1InDraw1 || !j2InDraw2) {
          throw new Error("One or both judges are not in the selected rooms");
        }
        
        // delete judge draws;
        await tx
          .delete(drawJudgesPS)
          .where(
            and(
              eq(drawJudgesPS.tabId, tabId),
              eq(drawJudgesPS.drawId, draw1.drawId),
              eq(drawJudgesPS.roomId, room1),
              eq(drawJudgesPS.judgeId, judge1)
            )
          );
        await tx
          .delete(drawJudgesPS)
          .where(
            and(
              eq(drawJudgesPS.tabId, tabId),
              eq(drawJudgesPS.drawId, draw2.drawId),
              eq(drawJudgesPS.roomId, room2),
              eq(drawJudgesPS.judgeId, judge2)
            )
          );

          //insert new judge draws
        await tx.insert(drawJudgesPS).values({
          tabId,
          drawId: draw1.drawId,
          roomId: room1,
          judgeId: judge2,
        });

        await tx.insert(drawJudgesPS).values({
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
    
    //move speaker
    if(swapState===3){
      const updated = await db.transaction(async (tx) => {
        const [draw1] = await tx
          .select({ drawId: drawsPS.drawId,  })
          .from(drawsPS)
          .where(and(
            eq(drawsPS.tabId, tabId), 
            eq(drawsPS.roundId, roundId), 
            eq(drawsPS.roomId, room1)))
          .limit(1);
        
        const [draw2] = await tx
          .select({ drawId: drawsPS.drawId })
          .from(drawsPS)
          .where(and(
            eq(drawsPS.tabId, tabId), 
            eq(drawsPS.roundId, roundId), 
            eq(drawsPS.roomId, room2)))
          .limit(1);

        if(!draw1 ||!draw2)
          throw new Error('Rooms had no draws in this round');

        //find speakers in drawspeakersps
        const [s1InDraw1] = await tx
          .select({ id: drawSpeakersPS.id })
          .from(drawSpeakersPS)
          .where(
            and(
              eq(drawSpeakersPS.tabId, tabId),
              eq(drawSpeakersPS.drawId, draw1.drawId),
              eq(drawSpeakersPS.roomId, room1),
              eq(drawSpeakersPS.speakerId, speaker1)
            )
          )
          .limit(1);

        if (!s1InDraw1) {
          throw new Error("Speaker is not in the selected rooms");
        }
        
        // delete speaker draw;
        await tx
          .delete(drawSpeakersPS)
          .where(
            and(
              eq(drawSpeakersPS.tabId, tabId),
              eq(drawSpeakersPS.drawId, draw1.drawId),
              eq(drawSpeakersPS.roomId, room1),
              eq(drawSpeakersPS.speakerId, speaker1)
            )
          );

          //insert new speaker draw
        await tx.insert(drawSpeakersPS).values({
          tabId,
          drawId: draw2.drawId,
          roomId: room2,
          speakerId: speaker1,
        });

        return {
          roundId,
          room1,
          room2,
          speaker1MovedTo: room2,
        };

      });
      return res.status(201).json({
      message: "Speaker moved successfully",
      data: updated,
      });
    }

    //move judge
    if(swapState===4){
      const updated = await db.transaction(async (tx) => {
        const [draw1] = await tx
          .select({ drawId: drawsPS.drawId,  })
          .from(drawsPS)
          .where(and(
            eq(drawsPS.tabId, tabId), 
            eq(drawsPS.roundId, roundId), 
            eq(drawsPS.roomId, room1)))
          .limit(1);
        
        const [draw2] = await tx
          .select({ drawId: drawsPS.drawId })
          .from(drawsPS)
          .where(and(
            eq(drawsPS.tabId, tabId), 
            eq(drawsPS.roundId, roundId), 
            eq(drawsPS.roomId, room2)))
          .limit(1);

        if(!draw1 ||!draw2)
          throw new Error('Rooms had no draws in this round');

        //find judge in drawJudges
        const [j1InDraw1] = await tx
          .select({ id: drawJudgesPS.id })
          .from(drawJudgesPS)
          .where(
            and(
              eq(drawJudgesPS.tabId, tabId),
              eq(drawJudgesPS.drawId, draw1.drawId),
              eq(drawJudgesPS.roomId, room1),
              eq(drawJudgesPS.judgeId, judge1)
            )
          )
          .limit(1);

        if (!j1InDraw1) {
          throw new Error("Judge is not in the selected rooms");
        }
        
        // delete judge draw;
        await tx
          .delete(drawJudgesPS)
          .where(
            and(
              eq(drawJudgesPS.tabId, tabId),
              eq(drawJudgesPS.drawId, draw1.drawId),
              eq(drawJudgesPS.roomId, room1),
              eq(drawJudgesPS.judgeId, judge1)
            )
          );

          //insert new judge draw
        await tx.insert(drawJudgesPS).values({
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

    //add speaker
    if(swapState===5){
      const updated=await db.transaction(async (tx)=>{
        //check if room had a draw in this round
        const [draw1] = await tx
          .select({ drawId: drawsPS.drawId,  })
          .from(drawsPS)
          .where(and(
            eq(drawsPS.tabId, tabId), 
            eq(drawsPS.roundId, roundId), 
            eq(drawsPS.roomId, room1)))
          .limit(1);

        if(!draw1)
          throw new Error('Room had no draw in this round');

        //check if speaker already in draw
        const [speakerInDraw] = await tx
          .select({ id: drawSpeakersPS.id })
          .from(drawSpeakersPS)
          .where(
            and(
              eq(drawSpeakersPS.tabId, tabId),
              eq(drawSpeakersPS.drawId, draw1.drawId),
              eq(drawSpeakersPS.speakerId, speaker1)
            )
          )
          .limit(1);

        if (speakerInDraw) {
          throw new Error("Speaker already in draw for this round");
        }

        //add new speaker draw
        await tx.insert(drawSpeakersPS).values({
          tabId,
          drawId: draw1.drawId,
          roomId: room1,
          speakerId: speaker1,
        });

        return {
          roundId,
          room1,
          speaker1,
          speaker1AddedTo: room1,
        };
      });

      return res.status(200).json({
      message: "Speaker added successfully",
      data: updated,
      });
    }
    //add judge
    if(swapState===6){
      const updated=await db.transaction(async (tx)=>{
        //check if room had a draw in this round
        const [draw1] = await tx
          .select({ drawId: drawsPS.drawId,  })
          .from(drawsPS)
          .where(and(
            eq(drawsPS.tabId, tabId), 
            eq(drawsPS.roundId, roundId), 
            eq(drawsPS.roomId, room1)))
          .limit(1);

        if(!draw1)
          throw new Error('Room had no draw in this round');

        //check if judge already in draw
        const [judgeInDraw] = await tx
          .select({ id: drawJudgesPS.id })
          .from(drawJudgesPS)
          .where(
            and(
              eq(drawJudgesPS.tabId, tabId),
              eq(drawJudgesPS.drawId, draw1.drawId),
              eq(drawJudgesPS.judgeId, judge1)
            )
          )
          .limit(1);

        if (judgeInDraw) {
          throw new Error("Judge already in draw for this round");
        }

        //add new judge draw
        await tx.insert(drawJudgesPS).values({
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
          .select({ drawId: drawsPS.drawId,  })
          .from(drawsPS)
          .where(and(
            eq(drawsPS.tabId, tabId), 
            eq(drawsPS.roundId, roundId), 
            eq(drawsPS.roomId, room1)))
          .limit(1);
        
        const [draw2] = await tx
          .select({ drawId: drawsPS.drawId })
          .from(drawsPS)
          .where(and(
            eq(drawsPS.tabId, tabId), 
            eq(drawsPS.roundId, roundId), 
            eq(drawsPS.roomId, room2)))
          .limit(1);

        if(!draw1 ||!draw2)
          throw new Error('One or both rooms had no draws in this round');

        //update draws
        const [newDraw1]=await tx
          .update(drawsPS)
          .set({roomId: room2})
          .where(and(eq(drawsPS.drawId, draw1.drawId), eq(drawsPS.roomId, room1)))
          .returning({
            drawId: drawsPS.drawId,
            roomId: drawsPS.roomId,
            roundId: drawsPS.roundId
          });
        const [newDraw2]=await tx
          .update(drawsPS)
          .set({roomId: room1})
          .where(and(eq(drawsPS.drawId, draw2.drawId), eq(drawsPS.roomId, room2)))
          .returning({
            drawId: drawsPS.drawId,
            roomId: drawsPS.roomId,
            roundId: drawsPS.roundId
          });
        if(!newDraw1 || !newDraw2) throw new Error('Error updating draws table');

        const newDrawSpeakers1=await tx
          .update(drawSpeakersPS)
          .set({roomId: newDraw1.roomId})
          .where(eq(drawSpeakersPS.drawId, draw1.drawId))
          .returning({
            drawId: drawSpeakersPS.drawId,
            roomId: drawSpeakersPS.roomId,
          });
        const newDrawSpeakers2=await tx
          .update(drawSpeakersPS)
          .set({roomId: newDraw2.roomId})
          .where(eq(drawSpeakersPS.drawId, draw2.drawId))
          .returning({
            drawId: drawSpeakersPS.drawId,
            roomId: drawSpeakersPS.roomId,
          });
        if(!newDrawSpeakers1.length || !newDrawSpeakers2.length) throw new Error('Error updating speaker draws table');

        const newDrawJudges1=await tx
          .update(drawJudgesPS)
          .set({roomId: newDraw1.roomId})
          .where(eq(drawJudgesPS.drawId, draw1.drawId))
          .returning({
            drawId: drawJudgesPS.drawId,
            roomId: drawJudgesPS.roomId,
          });
        const newDrawJudges2=await tx
          .update(drawJudgesPS)
          .set({roomId: newDraw2.roomId})
          .where(eq(drawJudgesPS.drawId, draw2.drawId))
          .returning({
            drawId: drawJudgesPS.drawId,
            roomId: drawJudgesPS.roomId,
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
          .select({ roundId: roundsPS.roundId, number: roundsPS.number })
          .from(roundsPS)
          .where(and(eq(roundsPS.tabId, tabId), eq(roundsPS.roundId, roundId)))
          .limit(1);
        if (!currentRound) throw new Error("Round not found");

        //check if room had a draw in this round
        const [draw1] = await tx
          .select({ drawId: drawsPS.drawId,  })
          .from(drawsPS)
          .where(and(
            eq(drawsPS.tabId, tabId), 
            eq(drawsPS.roundId, roundId), 
            eq(drawsPS.roomId, room1)))
          .limit(1);

        if(!draw1)
          throw new Error('Selected Room had no draw in this round');

        //check if new Room had a draw in this round
        const [draw2] = await tx
          .select({ drawId: drawsPS.drawId,  })
          .from(drawsPS)
          .where(and(
            eq(drawsPS.tabId, tabId), 
            eq(drawsPS.roundId, roundId), 
            eq(drawsPS.roomId, room2)))
          .limit(1);

        if(draw2)
          throw new Error('"Move to" room is occupied in this cup');

        //check if another round in a different cup has occupied the room
        const siblingRounds = await tx
          .select({ roundId: roundsPS.roundId })
          .from(roundsPS)
          .where(and(eq(roundsPS.tabId, tabId), eq(roundsPS.number, currentRound.number)));

        const siblingRoundIds = siblingRounds.map((r) => r.roundId);

        const occupiedTarget = await tx
          .select({ drawId: drawsPS.drawId, roundId: drawsPS.roundId })
          .from(drawsPS)
          .where(
            and(
              eq(drawsPS.tabId, tabId),
              eq(drawsPS.roomId, room2),
              inArray(drawsPS.roundId, siblingRoundIds)
            )
          )
          .limit(1);

        if (occupiedTarget.length) {
          throw new Error('Target room is occupied by another round in this time slot');
        }

        
        //update draw tables
        const [newDraw1]=await tx
          .update(drawsPS)
          .set({roomId: room2})
          .where(and(eq(drawsPS.drawId, draw1.drawId), eq(drawsPS.roomId, room1)))
          .returning({
            drawId: drawsPS.drawId,
            roomId: drawsPS.roomId,
            roundId: drawsPS.roundId
          });
        if(!newDraw1) throw new Error('Error updating draws table');

        const newDrawSpeakers1=await tx
          .update(drawSpeakersPS)
          .set({roomId: newDraw1.roomId})
          .where(eq(drawSpeakersPS.drawId, draw1.drawId))
          .returning({
            drawId: drawSpeakersPS.drawId,
            roomId: drawSpeakersPS.roomId,
          });
        if(!newDrawSpeakers1.length) throw new Error('Error updating speaker draws table');

        const newDrawJudges1=await tx
          .update(drawJudgesPS)
          .set({roomId: newDraw1.roomId})
          .where(eq(drawJudgesPS.drawId, draw1.drawId))
          .returning({
            drawId: drawJudgesPS.drawId,
            roomId: drawJudgesPS.roomId,
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
