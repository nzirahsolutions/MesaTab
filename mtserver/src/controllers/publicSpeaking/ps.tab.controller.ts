import { Request, Response } from 'express';
import { and, asc, eq, inArray, isNull } from 'drizzle-orm';
import { db } from '../../db/db';
import {
  cupCategoriesPS,
  drawJudgesPS,
  drawSpeakersPS,
  drawsPS,
  institutionsPS,
  judgesPS,
  roomsPS,
  roundsPS,
  speakersPS,
  speechPromptsPS,
  standingsPS,
  tabMastersPS,
  tabsBP,
  tabsChess,
  tabsPS,
  tabsSB,
  tabsWSDC,
  resultsPS,
} from '../../db/schema';
import { rebuildStandingsForTab } from './ps.results.controller';

type CupInput = {
  id?: number | string | null;
  cupCategory: string;
  cupOrder: number | string;
  breakNumber: number | string;
  breakCapacity: number | string;
};

type NormalizedCup = {
  id: number | null;
  cupCategory: string;
  cupOrder: number;
  breakNumber: number;
  breakCapacity: number;
};

const allowedBreakPhases = new Set(['Triples', 'Doubles', 'Octos', 'Quarters', 'Semis', 'Finals']);
const allowedSpeechTypes = new Set([
  'narrative',
  'dilemma',
  'philosophical',
  'informative',
  'inspirational',
  'impromptu',
  'selling',
  'special occassion',
  'creative',
  'other',
]);
const allBreakPhases = ['Triples','Doubles','Octos','Quarters','Semis','Finals'] as const;
function getBreakPhases(breakNumber: number) {
  if (breakNumber < 1 || breakNumber > allBreakPhases.length) {
    throw new Error("breakNumber must be between 1 and 6");
  }  
  return allBreakPhases.slice(allBreakPhases.length - breakNumber);
}

function parseBooleanInput(value: unknown): boolean | undefined {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') {
    if (value.toLowerCase() === 'true') return true;
    if (value.toLowerCase() === 'false') return false;
  }
  return undefined;
}

function parsePositiveIntOrNull(value: unknown): number | null {
  if (value === undefined || value === null || value === '') return null;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1) return Number.NaN;
  return parsed;
}

async function ensureInstitutionExists(tabId: string, institutionId: number) {
  const rows = await db
    .select({ id: institutionsPS.institutionId })
    .from(institutionsPS)
    .where(and(eq(institutionsPS.tabId, tabId), eq(institutionsPS.institutionId, institutionId)))
    .limit(1);
  return rows.length > 0;
}

async function ensureRoundExists(tabId: string, roundId: number) {
  const rows = await db
    .select({ id: roundsPS.roundId })
    .from(roundsPS)
    .where(and(eq(roundsPS.tabId, tabId), eq(roundsPS.roundId, roundId)))
    .limit(1);
  return rows.length > 0;
}

export async function getFullTab(req: Request, res: Response) {
  try {
    const { tabId } = req.params as { tabId?: string };
    if (!tabId) {
      return res.status(400).json({ message: 'tabId is required' });
    }

    const tabRows = await db
      .select({
        tabId: tabsPS.tabId,
        eventId: tabsPS.eventId,
        title: tabsPS.title,
        slug: tabsPS.slug,
        track: tabsPS.track,
        completed: tabsPS.completed,
        minScore: tabsPS.minScore,
        maxScore: tabsPS.maxScore,
      })
      .from(tabsPS)
      .where(eq(tabsPS.tabId, tabId))
      .limit(1);

    if (!tabRows.length) {
      return res.status(404).json({ message: 'Tab not found' });
    }

    const tab = tabRows[0];

    const [institutionRows, cups, speakers, judges, tabMasters, rooms, rounds, promptRows, draws, standingsRows] =
      await Promise.all([
        db
          .select({
            id: institutionsPS.institutionId,
            name: institutionsPS.name,
            code: institutionsPS.code,
          })
          .from(institutionsPS)
          .where(eq(institutionsPS.tabId, tab.tabId)),
        db
          .select({
            id: cupCategoriesPS.cupCategoryId,
            cupCategory: cupCategoriesPS.cupCategory,
            breakCapacity: cupCategoriesPS.breakCapacity,
            breakNumber: cupCategoriesPS.breakNumber,
            cupOrder: cupCategoriesPS.cupOrder,
          })
          .from(cupCategoriesPS)
          .where(eq(cupCategoriesPS.tabId, tab.tabId))
          .orderBy(asc(cupCategoriesPS.cupOrder), asc(cupCategoriesPS.cupCategoryId)),
        db
          .select({
            id: speakersPS.speakerId,
            name: speakersPS.name,
            email: speakersPS.email,
            institutionId: speakersPS.institutionId,
            available: speakersPS.available,
          })
          .from(speakersPS)
          .where(eq(speakersPS.tabId, tab.tabId)),
        db
          .select({
            id: judgesPS.judgeId,
            name: judgesPS.name,
            email: judgesPS.email,
            institutionId: judgesPS.institutionId,
            available: judgesPS.available,
          })
          .from(judgesPS)
          .where(eq(judgesPS.tabId, tab.tabId)),
        db
          .select({
            id: tabMastersPS.tabMasterId,
            name: tabMastersPS.name,
            email: tabMastersPS.email,
            institutionId: tabMastersPS.institutionId,
          })
          .from(tabMastersPS)
          .where(eq(tabMastersPS.tabId, tab.tabId)),
        db
          .select({
            id: roomsPS.roomId,
            name: roomsPS.name,
            available: roomsPS.available,
          })
          .from(roomsPS)
          .where(eq(roomsPS.tabId, tab.tabId)),
        db
          .select({
            roundId: roundsPS.roundId,
            name: roundsPS.name,
            number: roundsPS.number,
            breaks: roundsPS.breaks,
            completed: roundsPS.completed,
            cupCategoryId: roundsPS.cupCategoryId,
            breakPhase: roundsPS.breakPhase,
            blind: roundsPS.blind,
            speechDuration: roundsPS.speechDuration,
          })
          .from(roundsPS)
          .where(eq(roundsPS.tabId, tab.tabId))
          .orderBy(asc(roundsPS.number), asc(roundsPS.roundId)),
        db
          .select({
            id: speechPromptsPS.promptId,
            roundId: speechPromptsPS.roundId,
            speechPrompt: speechPromptsPS.speechPrompt,
            speechType: speechPromptsPS.speechType,
            visible: speechPromptsPS.visible,
          })
          .from(speechPromptsPS)
          .where(eq(speechPromptsPS.tabId, tab.tabId))
          .orderBy(asc(speechPromptsPS.roundId), asc(speechPromptsPS.promptId)),
        db
          .select({
            drawId: drawsPS.drawId,
            roundId: drawsPS.roundId,
            roomId: drawsPS.roomId,
          })
          .from(drawsPS)
          .where(eq(drawsPS.tabId, tab.tabId))
          .orderBy(asc(drawsPS.roundId), asc(drawsPS.roomId)),
        db
          .select({
            standingId: standingsPS.standingId,
            speakerId: standingsPS.speakerId,
            totalScore: standingsPS.totalScore,
            averageScore: standingsPS.averageScore,
            appearances: standingsPS.appearances,
            roundScores: standingsPS.roundScores,
            rank: standingsPS.rank,
            updatedAt: standingsPS.updatedAt,
          })
          .from(standingsPS)
          .where(eq(standingsPS.tabId, tab.tabId)),
      ]);

    const institutions = institutionRows.map((institution) => ({
      id: institution.id,
      name: institution.name,
      code: institution.code,
      speakers: speakers.filter((speaker) => speaker.institutionId === institution.id).length,
    }));

    const drawIds = draws.map((draw) => draw.drawId);
    const [drawSpeakerRows, drawJudgeRows] = drawIds.length
      ? await Promise.all([
          db
            .select({
              drawSpeakerId: drawSpeakersPS.id,
              drawId: drawSpeakersPS.drawId,
              speakerId: drawSpeakersPS.speakerId,
            })
            .from(drawSpeakersPS)
            .where(inArray(drawSpeakersPS.drawId, drawIds)),
          db
            .select({
              drawId: drawJudgesPS.drawId,
              judgeId: drawJudgesPS.judgeId,
            })
            .from(drawJudgesPS)
            .where(inArray(drawJudgesPS.drawId, drawIds)),
        ])
      : [[], []];

    const drawSpeakerIds = drawSpeakerRows.map((row) => row.drawSpeakerId);
    const resultsRows = drawSpeakerIds.length
      ? await db
          .select({
            drawSpeakerId: resultsPS.drawSpeakerId,
            resultId: resultsPS.resultId,
            score: resultsPS.score,
            status: resultsPS.status,
            createdAt: resultsPS.createdAt,
            updatedAt: resultsPS.updatedAt,
          })
          .from(resultsPS)
          .where(inArray(resultsPS.drawSpeakerId, drawSpeakerIds))
      : [];

    const speakerById = new Map(speakers.map((speaker) => [speaker.id, speaker]));
    const judgeById = new Map(judges.map((judge) => [judge.id, judge]));
    const roomById = new Map(rooms.map((room) => [room.id, room]));
    const resultByDrawSpeakerId = new Map(resultsRows.map((row) => [row.drawSpeakerId, row]));
    const promptByRoundId = new Map(promptRows.map((prompt) => [prompt.roundId, prompt]));

    const speakersByDraw = new Map<number, { drawSpeakerId: number; speakerId: number }[]>();
    for (const row of drawSpeakerRows) {
      const list = speakersByDraw.get(row.drawId) ?? [];
      list.push({ drawSpeakerId: row.drawSpeakerId, speakerId: row.speakerId });
      speakersByDraw.set(row.drawId, list);
    }

    const judgesByDraw = new Map<number, number[]>();
    for (const row of drawJudgeRows) {
      const list = judgesByDraw.get(row.drawId) ?? [];
      list.push(row.judgeId);
      judgesByDraw.set(row.drawId, list);
    }

    const drawsDetailed = draws.map((draw) => ({
      drawId: draw.drawId,
      roundId: draw.roundId,
      room: roomById.get(draw.roomId) ?? null,
      judges: (judgesByDraw.get(draw.drawId) ?? []).map((id) => judgeById.get(id)).filter(Boolean),
      prompt: promptByRoundId.get(draw.roundId) ?? null,
      speakers: (speakersByDraw.get(draw.drawId) ?? [])
        .map(({ drawSpeakerId, speakerId }) => {
          const speaker = speakerById.get(speakerId);
          if (!speaker) return null;
          return {
            ...speaker,
            drawSpeakerId,
            result: resultByDrawSpeakerId.get(drawSpeakerId) ?? null,
          };
        })
        .filter(Boolean),
    }));

    const hasBlindPrelims = rounds.filter((round) => round.breaks === false).some((round) => round.blind);
    const standingsRaw = standingsRows
      .map((standing) => {
        const speaker = speakerById.get(standing.speakerId);
        if (!speaker) return null;

        let roundScores: unknown[] = [];
        if (standing.roundScores) {
          try {
            const parsed = JSON.parse(standing.roundScores);
            roundScores = Array.isArray(parsed) ? parsed : [];
          } catch {
            roundScores = [];
          }
        }

        return {
          standingId: standing.standingId,
          rank: standing.rank,
          totalScore: standing.totalScore,
          averageScore: standing.averageScore,
          appearances: standing.appearances,
          roundScores,
          updatedAt: standing.updatedAt,
          speaker: {
            id: speaker.id,
            name: speaker.name,
            email: speaker.email,
            institutionId: speaker.institutionId,
          },
        };
      })
      .filter(Boolean);

    const standings = hasBlindPrelims
      ? standingsRaw.sort((a, b) => (a?.speaker.name ?? '').localeCompare(b?.speaker.name ?? ''))
      : standingsRaw.sort((a, b) => {
          const rankA = a?.rank ?? Number.MAX_SAFE_INTEGER;
          const rankB = b?.rank ?? Number.MAX_SAFE_INTEGER;
          return rankA - rankB;
        });

    return res.status(200).json({
      message: 'Tab fetched successfully',
      data: {
        tabID: tab.tabId,
        eventID: tab.eventId,
        track: tab.track,
        title: tab.title,
        slug: tab.slug,
        completed: tab.completed,
        minScore: tab.minScore,
        maxScore: tab.maxScore,
        institutions,
        cups,
        speakers,
        judges,
        tabMasters,
        rooms,
        rounds,
        speechPrompts: promptRows,
        draws: drawsDetailed,
        standings,
      },
    });
  } catch (error) {
    console.error('ps getFullTab error:', error);
    return res.status(500).json({ message: 'failed to fetch tab' });
  }
}

export async function updateTab(req: Request, res: Response) {
  try {
    const { title, slug, tabId, cups, completed, minScore, maxScore } = req.body as {
      title?: string;
      slug?: string;
      tabId?: string;
      completed?: boolean;
      minScore?: number | string;
      maxScore?: number | string;
      cups?: CupInput[];
    };

    const normalizedTitle = title?.trim();
    const normalizedSlug = slug?.toLowerCase().trim();
    const parsedMinScore = parsePositiveIntOrNull(minScore);
    const parsedMaxScore = parsePositiveIntOrNull(maxScore);

    if (!tabId || !normalizedTitle || !normalizedSlug || !Array.isArray(cups) || !cups.length) {
      return res.status(400).json({ message: 'title, slug, tabId and at least one cup are required' });
    }
    if (parsedMinScore === null || parsedMaxScore === null || Number.isNaN(parsedMinScore) || Number.isNaN(parsedMaxScore)) {
      return res.status(400).json({ message: 'minScore and maxScore must be positive integers' });
    }
    if (parsedMaxScore < parsedMinScore) {
      return res.status(400).json({ message: 'maxScore must be greater than or equal to minScore' });
    }

    const normalizedCupCandidates = cups.map((cup) => {
      const parsedCupOrder = parsePositiveIntOrNull(cup.cupOrder);
      const parsedBreakNumber = parsePositiveIntOrNull(cup.breakNumber);
      const parsedBreakCapacity = parsePositiveIntOrNull(cup.breakCapacity);
      const parsedId = cup.id === undefined || cup.id === null || cup.id === '' ? null : Number(cup.id);

      return {
        id: parsedId,
        cupCategory: String(cup.cupCategory ?? '').trim(),
        cupOrder: parsedCupOrder,
        breakNumber: parsedBreakNumber,
        breakCapacity: parsedBreakCapacity,
      };
    });

    if (
      normalizedCupCandidates.some(
        (cup) =>
          !cup.cupCategory ||
          cup.cupOrder === null ||
          cup.breakNumber === null ||
          cup.breakCapacity === null ||
          Number.isNaN(cup.cupOrder) ||
          Number.isNaN(cup.breakNumber) ||
          Number.isNaN(cup.breakCapacity) ||
          (cup.id !== null && (!Number.isInteger(cup.id) || cup.id < 1))
      )
    ) {
      return res.status(400).json({
        message: 'Cup names must not be empty and ids, orders, break numbers, and break capacities must be positive integers',
      });
    }

    const normalizedCups: NormalizedCup[] = normalizedCupCandidates.map((cup) => ({
      id: cup.id,
      cupCategory: cup.cupCategory,
      cupOrder: cup.cupOrder as number,
      breakNumber: cup.breakNumber as number,
      breakCapacity: cup.breakCapacity as number,
    }));

    const seenCupNames = new Set<string>();
    const seenCupOrders = new Set<number>();
    for (const cup of normalizedCups) {
      const key = cup.cupCategory.toLowerCase();
      if (seenCupNames.has(key)) {
        return res.status(409).json({ message: 'Cup names must be unique in a tab' });
      }
      if (seenCupOrders.has(cup.cupOrder)) {
        return res.status(409).json({ message: 'Cup orders must be unique in a tab' });
      }
      seenCupNames.add(key);
      seenCupOrders.add(cup.cupOrder);
    }

    const existingRows = await db
      .select({
        tabId: tabsPS.tabId,
        slug: tabsPS.slug,
        eventId: tabsPS.eventId,
      })
      .from(tabsPS)
      .where(eq(tabsPS.tabId, tabId))
      .limit(1);

    if (!existingRows.length) {
      return res.status(404).json({ message: 'Tab not found' });
    }

    if (existingRows[0].slug !== normalizedSlug) {
      const tabTables = [tabsBP, tabsWSDC, tabsPS, tabsSB, tabsChess] as const;
      const existingTabChecks = await Promise.all(
        tabTables.map((table) =>
          db
            .select({ slug: table.slug })
            .from(table)
            .where(and(eq(table.slug, normalizedSlug), eq(table.eventId, existingRows[0].eventId)))
            .limit(1)
        )
      );
      if (existingTabChecks.some((rows) => rows.length > 0)) {
        return res.status(409).json({ message: 'You already have a tab with that slug in this event' });
      }
    }

    const updatedData = await db.transaction(async (tx) => {
      const [updatedTab] = await tx
        .update(tabsPS)
        .set({
          title: normalizedTitle,
          slug: normalizedSlug,
          completed: completed ?? false,
          minScore: parsedMinScore,
          maxScore: parsedMaxScore,
        })
        .where(eq(tabsPS.tabId, tabId))
        .returning({
          tabId: tabsPS.tabId,
          title: tabsPS.title,
          slug: tabsPS.slug,
          completed: tabsPS.completed,
          minScore: tabsPS.minScore,
          maxScore: tabsPS.maxScore,
        });

      if (!updatedTab) throw new Error('Tab update failed');
      
      if(!updatedTab.completed){
      const existingCups = await tx
        .select({
          id: cupCategoriesPS.cupCategoryId,
          cupCategory: cupCategoriesPS.cupCategory,
          cupOrder: cupCategoriesPS.cupOrder,
          breakNumber: cupCategoriesPS.breakNumber,
          breakCapacity: cupCategoriesPS.breakCapacity,
        })
        .from(cupCategoriesPS)
        .where(eq(cupCategoriesPS.tabId, tabId))
        .orderBy(asc(cupCategoriesPS.cupOrder), asc(cupCategoriesPS.cupCategoryId));

      const existingCupIds = new Set(existingCups.map((cup) => cup.id));
      const incomingCupIds = new Set<number>();

      for (const cup of normalizedCups) {
        if (cup.id === null) continue;
        if (!existingCupIds.has(cup.id)) {
          throw new Error('One or more cups do not belong to this tab');
        }
        incomingCupIds.add(cup.id);
      }

      const cupsToDelete = existingCups.filter((cup) => !incomingCupIds.has(cup.id));
      if (cupsToDelete.length) {
        const referencedRounds = await tx
          .select({ roundId: roundsPS.roundId })
          .from(roundsPS)
          .where(and(eq(roundsPS.tabId, tabId), inArray(roundsPS.cupCategoryId, cupsToDelete.map((cup) => cup.id))));

        if (referencedRounds.length) {
          throw new Error('Cannot delete cups still used by rounds');
        }

        await tx.delete(cupCategoriesPS).where(inArray(cupCategoriesPS.cupCategoryId, cupsToDelete.map((cup) => cup.id)));
      }

      //update or insert cups
      const savedCups: Array<{
        id: number;
        cupCategory: string | null;
        cupOrder: number;
        breakNumber: number;
        breakCapacity: number;
      }> = [];
      for (const cup of normalizedCups) {
              if (cup.id !== null) {
                const [updatedCup] = await tx
                  .update(cupCategoriesPS)
                  .set({
                    cupCategory: cup.cupCategory,
                    cupOrder: cup.cupOrder,
                    breakNumber: cup.breakNumber,
                    breakCapacity: cup.breakCapacity,
                  })
                  .where(and(eq(cupCategoriesPS.tabId, tabId), eq(cupCategoriesPS.cupCategoryId, cup.id)))
                  .returning({
                    id: cupCategoriesPS.cupCategoryId,
                    cupCategory: cupCategoriesPS.cupCategory,
                    cupOrder: cupCategoriesPS.cupOrder,
                    breakNumber: cupCategoriesPS.breakNumber,
                    breakCapacity: cupCategoriesPS.breakCapacity,
                  });
                savedCups.push(updatedCup);
                continue;
              }
              const [newCup] = await tx
                        .insert(cupCategoriesPS)
                        .values({
                          tabId,
                          cupCategory: cup.cupCategory,
                          cupOrder: cup.cupOrder,
                          breakNumber: cup.breakNumber,
                          breakCapacity: cup.breakCapacity,
                        })
                        .returning({
                          id: cupCategoriesPS.cupCategoryId,
                          cupCategory: cupCategoriesPS.cupCategory,
                          cupOrder: cupCategoriesPS.cupOrder,
                          breakNumber: cupCategoriesPS.breakNumber,
                          breakCapacity: cupCategoriesPS.breakCapacity,
                        });
                      savedCups.push(newCup);
            }
      savedCups.sort((a, b) => a.cupOrder - b.cupOrder || a.id - b.id);
      
          //automatically add break rounds
          const existingBreakRounds = await tx
            .select({
              roundId: roundsPS.roundId,
              cupCategoryId: roundsPS.cupCategoryId,
              breakPhase: roundsPS.breakPhase,
              name: roundsPS.name,
              number: roundsPS.number,
            })
            .from(roundsPS)
            .where(and(eq(roundsPS.tabId, tabId), eq(roundsPS.breaks, true)))
            .orderBy(asc(roundsPS.number), asc(roundsPS.roundId));
      
          let nextBreakRoundNumber = 30;
      
          //return the an array of the new break rounds with cupCategory id, breakPhase, name, number  
          const expectedBreakRounds = savedCups.flatMap((cup) => {
            const phases = getBreakPhases(cup.breakNumber);
      
            return phases.map((phase) => ({
              cupCategoryId: cup.id,
              breakPhase: phase,
              name: `${cup.cupCategory} ${phase}`,
              number: nextBreakRoundNumber++,
            }));
          });
      
          const existingBreakRoundByKey = new Map(
            existingBreakRounds
              .filter((round) => round.cupCategoryId && round.breakPhase)
              .map((round) => [
                `${round.cupCategoryId}:${round.breakPhase}`,
                round,
              ])
          );
      
          const expectedBreakRoundKeys = new Set<string>();
          for (const round of expectedBreakRounds) {
            const key = `${round.cupCategoryId}:${round.breakPhase}`;
            if (expectedBreakRoundKeys.has(key)) {
              throw new Error(`Duplicate expected break round for cupCategoryId ${round.cupCategoryId} and phase ${round.breakPhase}`);
            }
            expectedBreakRoundKeys.add(key);
          }
      
          const existingBreakRoundNumbers = new Set(existingBreakRounds.map((round) => round.number));
          let tempBreakNumber = nextBreakRoundNumber;
      
          for (const expectedRound of expectedBreakRounds) {
            const key = `${expectedRound.cupCategoryId}:${expectedRound.breakPhase}`;
            const existingRound = existingBreakRoundByKey.get(key);
            if (!existingRound) {
              if (existingBreakRoundNumbers.has(tempBreakNumber)) {
                throw new Error(`Break round number collision at ${tempBreakNumber}; existing break rounds must be cleaned before creating new ones`);
              }
              tempBreakNumber++;
            }
      
            if (!existingRound) {
              await tx
                .insert(roundsPS)
                .values({
                  tabId,
                  name: expectedRound.name,
                  number: expectedRound.number,
                  breaks: true,
                  cupCategoryId: expectedRound.cupCategoryId,
                  breakPhase: expectedRound.breakPhase,
                  completed: false,
                  speechDuration: 4,
                  blind: false,
                });
              continue;
            }
      
            await tx
              .update(roundsPS)
              .set({
                name: expectedRound.name,
                number: existingRound.number,
                breaks: true,
                cupCategoryId: expectedRound.cupCategoryId,
                breakPhase: expectedRound.breakPhase,
                speechDuration:4,
                blind: false,
              })
              .where(eq(roundsPS.roundId, existingRound.roundId));
          }
          //to remove break rounds that are no longer needed when a cup’s breakNumber decreases
          for (const existingRound of existingBreakRounds) {
              if (!existingRound.cupCategoryId || !existingRound.breakPhase) continue;
      
              const key = `${existingRound.cupCategoryId}:${existingRound.breakPhase}`;
              if (expectedBreakRoundKeys.has(key)) continue;
      
              await tx
                .delete(roundsPS)
                .where(eq(roundsPS.roundId, existingRound.roundId));
            }
            return {
              tab: updatedTab,
              cups: savedCups,
              };
            }
            else{ //lock tab rounds
                  const locked= await tx
                    .update(roundsPS)
                    .set({completed: true, blind: false})
                    .where(eq(roundsPS.tabId, tabId))
                    .returning({roundId: roundsPS.roundId, name: roundsPS.name});
                  
                  if(!locked.length) throw new Error("Couldn't lock rounds");
                }
            });
          

    return res.status(200).json({
      message: 'Tab updated successfully',
      data: updatedData,
    });
  } catch (error) {
    console.error('ps updateTab error:', error);
    const message = error instanceof Error ? error.message : 'failed to update tab';
    return res.status(message.includes('used by rounds') ? 409 : 500).json({ message });
  }
}

export async function addInstitution(req: Request, res: Response) {
  try {
    const { name, code, tabId } = req.body as { name?: string; code?: string; tabId?: string };
    const normalizedName = name?.trim();
    const normalizedCode = code?.trim().toUpperCase();
    if (!normalizedName || !normalizedCode || !tabId) {
      return res.status(400).json({ message: 'name, code and tabId are required' });
    }

    const existing = await db
      .select({ id: institutionsPS.institutionId })
      .from(institutionsPS)
      .where(and(eq(institutionsPS.tabId, tabId), eq(institutionsPS.code, normalizedCode)))
      .limit(1);
    if (existing.length) {
      return res.status(409).json({ message: 'Institution code already exists in tab' });
    }

    const created = await db
      .insert(institutionsPS)
      .values({ tabId, name: normalizedName, code: normalizedCode })
      .returning({
        id: institutionsPS.institutionId,
        name: institutionsPS.name,
        code: institutionsPS.code,
        tabId: institutionsPS.tabId,
      });

    return res.status(201).json({ message: 'Institution added successfully', data: created[0] });
  } catch (error) {
    console.error('ps addInstitution error:', error);
    return res.status(500).json({ message: 'failed to add institution' });
  }
}

export async function updateInstitution(req: Request, res: Response) {
  try {
    const { id, tabId, name, code } = req.body as { id?: number; tabId?: string; name?: string; code?: string };
    const normalizedName = name?.trim();
    const normalizedCode = code?.trim().toUpperCase();
    if (!id || !tabId || !normalizedName || !normalizedCode) {
      return res.status(400).json({ message: 'id, tabId, name and code are required' });
    }

    const existing = await db
      .select({ id: institutionsPS.institutionId })
      .from(institutionsPS)
      .where(and(eq(institutionsPS.tabId, tabId), eq(institutionsPS.code, normalizedCode)))
      .limit(1);
    if (existing.length && existing[0].id !== id) {
      return res.status(409).json({ message: 'Institution code already exists in tab' });
    }

    const updated = await db
      .update(institutionsPS)
      .set({ name: normalizedName, code: normalizedCode })
      .where(and(eq(institutionsPS.tabId, tabId), eq(institutionsPS.institutionId, id)))
      .returning({
        id: institutionsPS.institutionId,
        name: institutionsPS.name,
        code: institutionsPS.code,
        tabId: institutionsPS.tabId,
      });

    if (!updated.length) {
      return res.status(404).json({ message: 'Institution not found' });
    }

    return res.status(200).json({ message: 'Institution updated successfully', data: updated[0] });
  } catch (error) {
    console.error('ps updateInstitution error:', error);
    return res.status(500).json({ message: 'failed to update institution' });
  }
}

export async function deleteInstitution(req: Request, res: Response) {
  try {
    const { id, tabId } = req.body as { id?: number; tabId?: string };
    if (!id || !tabId) {
      return res.status(400).json({ message: 'id and tabId are required' });
    }

    const deleted = await db
      .delete(institutionsPS)
      .where(and(eq(institutionsPS.institutionId, id), eq(institutionsPS.tabId, tabId)))
      .returning({
        id: institutionsPS.institutionId,
        name: institutionsPS.name,
        code: institutionsPS.code,
      });

    if (!deleted.length) {
      return res.status(404).json({ message: 'Institution not found' });
    }

    await rebuildStandingsForTab(tabId);

    return res.status(200).json({ message: 'Institution removed successfully', data: deleted[0] });
  } catch (error) {
    console.error('ps deleteInstitution error:', error);
    return res.status(500).json({ message: 'failed to delete institution' });
  }
}

export async function addSpeaker(req: Request, res: Response) {
  try {
    const { name, institutionId, email, tabId } = req.body as {
      name?: string;
      institutionId?: number | string;
      email?: string | null;
      tabId?: string;
    };
    const normalizedName = name?.trim();
    const parsedInstitutionId = parsePositiveIntOrNull(institutionId);
    const normalizedEmail = email?.trim() ? email.trim().toLowerCase() : null;

    if (!normalizedName || !tabId || parsedInstitutionId === null || Number.isNaN(parsedInstitutionId)) {
      return res.status(400).json({ message: 'name, institutionId and tabId are required' });
    }
    if (!(await ensureInstitutionExists(tabId, parsedInstitutionId))) {
      return res.status(404).json({ message: 'Institution not found in this tab' });
    }

    const created = await db
      .insert(speakersPS)
      .values({
        tabId,
        institutionId: parsedInstitutionId,
        name: normalizedName,
        email: normalizedEmail,
      })
      .returning({
        id: speakersPS.speakerId,
        name: speakersPS.name,
        email: speakersPS.email,
        institutionId: speakersPS.institutionId,
        available: speakersPS.available,
        tabId: speakersPS.tabId,
      });

    return res.status(201).json({ message: 'Speaker added successfully', data: created[0] });
  } catch (error) {
    console.error('ps addSpeaker error:', error);
    return res.status(500).json({ message: 'failed to add speaker' });
  }
}

export async function updateSpeaker(req: Request, res: Response) {
  try {
    const { id, tabId, name, institutionId, email, available } = req.body as {
      id?: number;
      tabId?: string;
      name?: string;
      institutionId?: number | string;
      email?: string | null;
      available?: boolean | string;
    };

    const parsedInstitutionId = parsePositiveIntOrNull(institutionId);
    const normalizedName = name?.trim();
    const normalizedEmail = email?.trim() ? email.trim().toLowerCase() : null;
    const parsedAvailable = parseBooleanInput(available);

    if (!id || !tabId || !normalizedName || parsedInstitutionId === null || Number.isNaN(parsedInstitutionId)) {
      return res.status(400).json({ message: 'id, tabId, name and institutionId are required' });
    }
    if (!(await ensureInstitutionExists(tabId, parsedInstitutionId))) {
      return res.status(404).json({ message: 'Institution not found in this tab' });
    }

    const updated = await db
      .update(speakersPS)
      .set({
        name: normalizedName,
        institutionId: parsedInstitutionId,
        email: normalizedEmail,
        available: parsedAvailable ?? true,
      })
      .where(and(eq(speakersPS.speakerId, id), eq(speakersPS.tabId, tabId)))
      .returning({
        id: speakersPS.speakerId,
        name: speakersPS.name,
        email: speakersPS.email,
        institutionId: speakersPS.institutionId,
        available: speakersPS.available,
        tabId: speakersPS.tabId,
      });

    if (!updated.length) {
      return res.status(404).json({ message: 'Speaker not found' });
    }

    return res.status(200).json({ message: 'Speaker updated successfully', data: updated[0] });
  } catch (error) {
    console.error('ps updateSpeaker error:', error);
    return res.status(500).json({ message: 'failed to update speaker' });
  }
}

export async function deleteSpeaker(req: Request, res: Response) {
  try {
    const { id, tabId } = req.body as { id?: number; tabId?: string };
    if (!id || !tabId) {
      return res.status(400).json({ message: 'id and tabId are required' });
    }

    const deleted = await db
      .delete(speakersPS)
      .where(and(eq(speakersPS.speakerId, id), eq(speakersPS.tabId, tabId)))
      .returning({
        id: speakersPS.speakerId,
        name: speakersPS.name,
      });

    if (!deleted.length) {
      return res.status(404).json({ message: 'Speaker not found' });
    }

    await rebuildStandingsForTab(tabId);

    return res.status(200).json({ message: 'Speaker removed successfully', data: deleted[0] });
  } catch (error) {
    console.error('ps deleteSpeaker error:', error);
    return res.status(500).json({ message: 'failed to delete speaker' });
  }
}

export async function addJudge(req: Request, res: Response) {
  try {
    const { name, institutionId, email, tabId } = req.body as {
      name?: string;
      institutionId?: number | string;
      email?: string | null;
      tabId?: string;
    };

    const normalizedName = name?.trim();
    const parsedInstitutionId = parsePositiveIntOrNull(institutionId);
    const normalizedEmail = email?.trim() ? email.trim().toLowerCase() : null;

    if (!normalizedName || !tabId || parsedInstitutionId === null || Number.isNaN(parsedInstitutionId)) {
      return res.status(400).json({ message: 'name, institutionId and tabId are required' });
    }
    if (!(await ensureInstitutionExists(tabId, parsedInstitutionId))) {
      return res.status(404).json({ message: 'Institution not found in this tab' });
    }

    const created = await db
      .insert(judgesPS)
      .values({
        tabId,
        institutionId: parsedInstitutionId,
        name: normalizedName,
        email: normalizedEmail,
      })
      .returning({
        id: judgesPS.judgeId,
        name: judgesPS.name,
        email: judgesPS.email,
        institutionId: judgesPS.institutionId,
        available: judgesPS.available,
        tabId: judgesPS.tabId,
      });

    return res.status(201).json({ message: 'Judge added successfully', data: created[0] });
  } catch (error) {
    console.error('ps addJudge error:', error);
    return res.status(500).json({ message: 'failed to add judge' });
  }
}

export async function updateJudge(req: Request, res: Response) {
  try {
    const { id, tabId, name, institutionId, email, available } = req.body as {
      id?: number;
      tabId?: string;
      name?: string;
      institutionId?: number | string;
      email?: string | null;
      available?: boolean | string;
    };
    const parsedInstitutionId = parsePositiveIntOrNull(institutionId);
    const normalizedName = name?.trim();
    const normalizedEmail = email?.trim() ? email.trim().toLowerCase() : null;
    const parsedAvailable = parseBooleanInput(available);

    if (!id || !tabId || !normalizedName || parsedInstitutionId === null || Number.isNaN(parsedInstitutionId)) {
      return res.status(400).json({ message: 'id, tabId, name and institutionId are required' });
    }
    if (!(await ensureInstitutionExists(tabId, parsedInstitutionId))) {
      return res.status(404).json({ message: 'Institution not found in this tab' });
    }

    const updated = await db
      .update(judgesPS)
      .set({
        name: normalizedName,
        institutionId: parsedInstitutionId,
        email: normalizedEmail,
        available: parsedAvailable ?? true,
      })
      .where(and(eq(judgesPS.judgeId, id), eq(judgesPS.tabId, tabId)))
      .returning({
        id: judgesPS.judgeId,
        name: judgesPS.name,
        email: judgesPS.email,
        institutionId: judgesPS.institutionId,
        available: judgesPS.available,
        tabId: judgesPS.tabId,
      });

    if (!updated.length) {
      return res.status(404).json({ message: 'Judge not found' });
    }

    return res.status(200).json({ message: 'Judge updated successfully', data: updated[0] });
  } catch (error) {
    console.error('ps updateJudge error:', error);
    return res.status(500).json({ message: 'failed to update judge' });
  }
}

export async function deleteJudge(req: Request, res: Response) {
  try {
    const { id, tabId } = req.body as { id?: number; tabId?: string };
    if (!id || !tabId) {
      return res.status(400).json({ message: 'id and tabId are required' });
    }

    const deleted = await db
      .delete(judgesPS)
      .where(and(eq(judgesPS.judgeId, id), eq(judgesPS.tabId, tabId)))
      .returning({
        id: judgesPS.judgeId,
        name: judgesPS.name,
      });

    if (!deleted.length) {
      return res.status(404).json({ message: 'Judge not found' });
    }

    return res.status(200).json({ message: 'Judge removed successfully', data: deleted[0] });
  } catch (error) {
    console.error('ps deleteJudge error:', error);
    return res.status(500).json({ message: 'failed to delete judge' });
  }
}

export async function addTabMaster(req: Request, res: Response) {
  try {
    const { name, institutionId, email, tabId } = req.body as {
      name?: string;
      institutionId?: number | string;
      email?: string;
      tabId?: string;
    };

    const normalizedName = name?.trim();
    const parsedInstitutionId = parsePositiveIntOrNull(institutionId);
    const normalizedEmail = email?.trim()?.toLowerCase();

    if (!normalizedName || !tabId || !normalizedEmail || parsedInstitutionId === null || Number.isNaN(parsedInstitutionId)) {
      return res.status(400).json({ message: 'name, institutionId, email and tabId are required' });
    }
    if (!(await ensureInstitutionExists(tabId, parsedInstitutionId))) {
      return res.status(404).json({ message: 'Institution not found in this tab' });
    }

    const created = await db
      .insert(tabMastersPS)
      .values({
        tabId,
        institutionId: parsedInstitutionId,
        name: normalizedName,
        email: normalizedEmail,
      })
      .returning({
        id: tabMastersPS.tabMasterId,
        name: tabMastersPS.name,
        email: tabMastersPS.email,
        institutionId: tabMastersPS.institutionId,
        tabId: tabMastersPS.tabId,
      });

    return res.status(201).json({ message: 'Tab Master added successfully', data: created[0] });
  } catch (error) {
    console.error('ps addTabMaster error:', error);
    return res.status(500).json({ message: 'failed to add tab master' });
  }
}

export async function updateTabMaster(req: Request, res: Response) {
  try {
    const { id, tabId, name, institutionId, email } = req.body as {
      id?: number;
      tabId?: string;
      name?: string;
      institutionId?: number | string;
      email?: string;
    };

    const parsedInstitutionId = parsePositiveIntOrNull(institutionId);
    const normalizedName = name?.trim();
    const normalizedEmail = email?.trim()?.toLowerCase();

    if (!id || !tabId || !normalizedName || !normalizedEmail || parsedInstitutionId === null || Number.isNaN(parsedInstitutionId)) {
      return res.status(400).json({ message: 'id, tabId, name, institutionId and email are required' });
    }
    if (!(await ensureInstitutionExists(tabId, parsedInstitutionId))) {
      return res.status(404).json({ message: 'Institution not found in this tab' });
    }

    const updated = await db
      .update(tabMastersPS)
      .set({
        name: normalizedName,
        institutionId: parsedInstitutionId,
        email: normalizedEmail,
      })
      .where(and(eq(tabMastersPS.tabMasterId, id), eq(tabMastersPS.tabId, tabId)))
      .returning({
        id: tabMastersPS.tabMasterId,
        name: tabMastersPS.name,
        email: tabMastersPS.email,
        institutionId: tabMastersPS.institutionId,
        tabId: tabMastersPS.tabId,
      });

    if (!updated.length) {
      return res.status(404).json({ message: 'Tab Master not found' });
    }

    return res.status(200).json({ message: 'Tab Master updated successfully', data: updated[0] });
  } catch (error) {
    console.error('ps updateTabMaster error:', error);
    return res.status(500).json({ message: 'failed to update tab master' });
  }
}

export async function deleteTabMaster(req: Request, res: Response) {
  try {
    const { id, tabId } = req.body as { id?: number; tabId?: string };
    if (!id || !tabId) {
      return res.status(400).json({ message: 'id and tabId are required' });
    }

    const deleted = await db
      .delete(tabMastersPS)
      .where(and(eq(tabMastersPS.tabMasterId, id), eq(tabMastersPS.tabId, tabId)))
      .returning({
        id: tabMastersPS.tabMasterId,
        name: tabMastersPS.name,
      });

    if (!deleted.length) {
      return res.status(404).json({ message: 'Tab Master not found' });
    }

    return res.status(200).json({ message: 'Tab Master removed successfully', data: deleted[0] });
  } catch (error) {
    console.error('ps deleteTabMaster error:', error);
    return res.status(500).json({ message: 'failed to delete tab master' });
  }
}

export async function addRoom(req: Request, res: Response) {
  try {
    const { name, tabId, available } = req.body as { name?: string; tabId?: string; available?:boolean; };
    const normalizedName = name?.trim();
    if (!normalizedName || !tabId) {
      return res.status(400).json({ message: 'name and tabId are required' });
    }

    const created = await db
      .insert(roomsPS)
      .values({ tabId, name: normalizedName, available: available })
      .returning({
        id: roomsPS.roomId,
        name: roomsPS.name,
        available: roomsPS.available,
        tabId: roomsPS.tabId,
      });

    return res.status(201).json({ message: 'Room added successfully', data: created[0] });
  } catch (error) {
    console.error('ps addRoom error:', error);
    return res.status(500).json({ message: 'failed to add room' });
  }
}

export async function updateRoom(req: Request, res: Response) {
  try {
    const { id, tabId, name, available } = req.body as {
      id?: number;
      tabId?: string;
      name?: string;
      available?: boolean | string;
    };
    const normalizedName = name?.trim();
    const parsedAvailable = parseBooleanInput(available);
    if (!id || !tabId || !normalizedName) {
      return res.status(400).json({ message: 'id, tabId and name are required' });
    }

    const updated = await db
      .update(roomsPS)
      .set({
        name: normalizedName,
        available: parsedAvailable ?? true,
      })
      .where(and(eq(roomsPS.roomId, id), eq(roomsPS.tabId, tabId)))
      .returning({
        id: roomsPS.roomId,
        name: roomsPS.name,
        available: roomsPS.available,
        tabId: roomsPS.tabId,
      });

    if (!updated.length) {
      return res.status(404).json({ message: 'Room not found' });
    }

    return res.status(200).json({ message: 'Room updated successfully', data: updated[0] });
  } catch (error) {
    console.error('ps updateRoom error:', error);
    return res.status(500).json({ message: 'failed to update room' });
  }
}

export async function deleteRoom(req: Request, res: Response) {
  try {
    const { id, tabId } = req.body as { id?: number; tabId?: string };
    if (!id || !tabId) {
      return res.status(400).json({ message: 'id and tabId are required' });
    }

    const deleted = await db
      .delete(roomsPS)
      .where(and(eq(roomsPS.roomId, id), eq(roomsPS.tabId, tabId)))
      .returning({
        id: roomsPS.roomId,
        name: roomsPS.name,
      });

    if (!deleted.length) {
      return res.status(404).json({ message: 'Room not found' });
    }

    await rebuildStandingsForTab(tabId);

    return res.status(200).json({ message: 'Room removed successfully', data: deleted[0] });
  } catch (error) {
    console.error('ps deleteRoom error:', error);
    return res.status(500).json({ message: 'failed to delete room' });
  }
}

export async function addRound(req: Request, res: Response) {
  try {
    const { name, tabId, number, breaks, blind, speechDuration, breakPhase, breakCategory } = req.body as {
      name?: string;
      tabId?: string;
      number?: number | string | null;
      breaks?: boolean | string;
      blind?: boolean | string;
      speechDuration?: number | string | null;
      breakPhase?: string;
      breakCategory?: number | string | null;
    };

    const normalizedName = name?.trim();
    const parsedBreaks = parseBooleanInput(breaks) ?? false;
    const parsedBlind = parseBooleanInput(blind) ?? false;
    const parsedNumber = parsePositiveIntOrNull(number);
    const parsedSpeechDuration = parsePositiveIntOrNull(speechDuration);
    const parsedBreakCategory = parsePositiveIntOrNull(breakCategory);
    const normalizedBreakPhase = breakPhase?.trim() || null;

    if (!normalizedName || !tabId || parsedSpeechDuration === null || Number.isNaN(parsedSpeechDuration)) {
      return res.status(400).json({ message: 'name, tabId and speechDuration are required' });
    }

    let targetNumber = parsedNumber;
    if (Number.isNaN(targetNumber)) {
      return res.status(400).json({ message: 'Round number must be a positive integer' });
    }
    if (targetNumber === null) {
      const existingNumbers = await db
        .select({ number: roundsPS.number })
        .from(roundsPS)
        .where(eq(roundsPS.tabId, tabId))
        .orderBy(asc(roundsPS.number));
      targetNumber = existingNumbers.length ? existingNumbers[existingNumbers.length - 1].number + 1 : 1;
    }

    if (parsedBreaks) {
      if (!normalizedBreakPhase || parsedBreakCategory === null || Number.isNaN(parsedBreakCategory)) {
        return res.status(400).json({ message: 'choose break phase and break category' });
      }
      if (!allowedBreakPhases.has(normalizedBreakPhase)) {
        return res.status(400).json({ message: 'Invalid break phase' });
      }
      const categoryExists = await db
        .select({ id: cupCategoriesPS.cupCategoryId })
        .from(cupCategoriesPS)
        .where(and(eq(cupCategoriesPS.tabId, tabId), eq(cupCategoriesPS.cupCategoryId, parsedBreakCategory)))
        .limit(1);
      if (!categoryExists.length) {
        return res.status(404).json({ message: 'Break category not found in this tab' });
      }
    }

    const existingNumber = await db
      .select({ roundId: roundsPS.roundId })
      .from(roundsPS)
      .where(and(eq(roundsPS.tabId, tabId), eq(roundsPS.number, targetNumber)))
      .limit(1);
    if (existingNumber.length) {
      return res.status(409).json({ message: 'Round number already exists in this tab' });
    }

    const created = await db
      .insert(roundsPS)
      .values({
        name: normalizedName,
        tabId,
        number: targetNumber,
        breaks: parsedBreaks,
        blind: parsedBlind,
        cupCategoryId: parsedBreaks ? parsedBreakCategory : null,
        breakPhase: parsedBreaks ? (normalizedBreakPhase as any) : null,
        speechDuration: parsedSpeechDuration,
      })
      .returning({
        roundId: roundsPS.roundId,
        name: roundsPS.name,
        tabId: roundsPS.tabId,
        number: roundsPS.number,
        breaks: roundsPS.breaks,
        completed: roundsPS.completed,
        blind: roundsPS.blind,
        cupCategoryId: roundsPS.cupCategoryId,
        breakPhase: roundsPS.breakPhase,
        speechDuration: roundsPS.speechDuration,
      });

    return res.status(201).json({ message: 'Round added successfully', data: created[0] });
  } catch (error) {
    console.error('ps addRound error:', error);
    return res.status(500).json({ message: 'failed to add round' });
  }
}

export async function updateRound(req: Request, res: Response) {
  try {
    const { id, roundId, tabId, name, number, breaks, completed, blind, speechDuration, breakPhase, breakCategory } = req.body as {
      id?: number;
      roundId?: number;
      tabId?: string;
      name?: string;
      number?: number | string | null;
      breaks?: boolean | string;
      completed?: boolean | string;
      blind?: boolean | string;
      speechDuration?: number | string | null;
      breakPhase?: string;
      breakCategory?: number | string | null;
    };

    const targetRoundId = roundId ?? id;
    if (!tabId || !targetRoundId) {
      return res.status(400).json({ message: 'Provide tabId and roundId' });
    }

    const existingRows = await db
      .select({
        roundId: roundsPS.roundId,
        name: roundsPS.name,
        number: roundsPS.number,
        breaks: roundsPS.breaks,
        completed: roundsPS.completed,
        blind: roundsPS.blind,
        cupCategoryId: roundsPS.cupCategoryId,
        breakPhase: roundsPS.breakPhase,
        speechDuration: roundsPS.speechDuration,
      })
      .from(roundsPS)
      .where(and(eq(roundsPS.tabId, tabId), eq(roundsPS.roundId, targetRoundId)))
      .limit(1);

    if (!existingRows.length) {
      return res.status(404).json({ message: 'Round not found' });
    }

    const prev = existingRows[0];
    const nextBreaks = parseBooleanInput(breaks) ?? prev.breaks;
    const nextCompleted = parseBooleanInput(completed) ?? prev.completed;
    const nextBlind = parseBooleanInput(blind) ?? prev.blind;
    const nextName = name?.trim() || prev.name;
    const parsedNumber = parsePositiveIntOrNull(number);
    const parsedSpeechDuration = parsePositiveIntOrNull(speechDuration);
    const parsedBreakCategory = parsePositiveIntOrNull(breakCategory);
    const normalizedBreakPhase = breakPhase?.trim() || null;

    if (Number.isNaN(parsedNumber) || Number.isNaN(parsedSpeechDuration) || Number.isNaN(parsedBreakCategory)) {
      return res.status(400).json({ message: 'Round numeric fields must be positive integers' });
    }

    const nextNumber = number !== undefined ? parsedNumber ?? prev.number : prev.number;
    const nextSpeechDuration = speechDuration !== undefined ? parsedSpeechDuration ?? prev.speechDuration : prev.speechDuration;
    const nextBreakPhase = nextBreaks ? (breakPhase !== undefined ? normalizedBreakPhase : prev.breakPhase) : null;
    const nextBreakCategory = nextBreaks ? (breakCategory !== undefined ? parsedBreakCategory : prev.cupCategoryId) : null;

    if (nextBreaks) {
      if (!nextBreakPhase || nextBreakCategory === null) {
        return res.status(400).json({ message: 'choose break phase and break category' });
      }
      if (!allowedBreakPhases.has(nextBreakPhase)) {
        return res.status(400).json({ message: 'Invalid break phase' });
      }
      const categoryExists = await db
        .select({ id: cupCategoriesPS.cupCategoryId })
        .from(cupCategoriesPS)
        .where(and(eq(cupCategoriesPS.tabId, tabId), eq(cupCategoriesPS.cupCategoryId, nextBreakCategory)))
        .limit(1);
      if (!categoryExists.length) {
        return res.status(404).json({ message: 'Break category not found in this tab' });
      }
    }

    const existingNumber = await db
      .select({ roundId: roundsPS.roundId })
      .from(roundsPS)
      .where(
        and(
          eq(roundsPS.tabId, tabId),
          eq(roundsPS.number, nextNumber),
          nextBreakCategory === null
            ? isNull(roundsPS.cupCategoryId)
            : eq(roundsPS.cupCategoryId, nextBreakCategory)
        )
      )
      .limit(1);
    if (existingNumber.length && existingNumber[0].roundId !== targetRoundId) {
      return res.status(409).json({ message: 'Round number already exists in this tab/cup' });
    }

    const updated = await db
      .update(roundsPS)
      .set({
        name: nextName,
        number: nextNumber,
        breaks: nextBreaks,
        completed: nextCompleted,
        blind: nextBlind,
        cupCategoryId: nextBreakCategory,
        breakPhase: nextBreakPhase as any,
        speechDuration: nextSpeechDuration,
      })
      .where(and(eq(roundsPS.tabId, tabId), eq(roundsPS.roundId, targetRoundId)))
      .returning({
        roundId: roundsPS.roundId,
        name: roundsPS.name,
        tabId: roundsPS.tabId,
        number: roundsPS.number,
        breaks: roundsPS.breaks,
        completed: roundsPS.completed,
        blind: roundsPS.blind,
        cupCategoryId: roundsPS.cupCategoryId,
        breakPhase: roundsPS.breakPhase,
        speechDuration: roundsPS.speechDuration,
      });

    return res.status(200).json({ message: 'Round updated successfully', data: updated[0] });
  } catch (error) {
    console.error('ps updateRound error:', error);
    return res.status(500).json({ message: 'failed to update round' });
  }
}

export async function deleteRound(req: Request, res: Response) {
  try {
    const { id, roundId, tabId } = req.body as { id?: number; roundId?: number; tabId?: string };
    const targetRoundId = roundId ?? id;
    if (!targetRoundId || !tabId) {
      return res.status(400).json({ message: 'roundId and tabId required' });
    }

    const roundRows = await db
      .select({ roundId: roundsPS.roundId, completed: roundsPS.completed })
      .from(roundsPS)
      .where(and(eq(roundsPS.roundId, targetRoundId), eq(roundsPS.tabId, tabId)))
      .limit(1);

    if (!roundRows.length) {
      return res.status(404).json({ message: 'Round not found on tab' });
    }
    if (roundRows[0].completed) {
      return res.status(409).json({ message: 'Round marked as completed on tab' });
    }

    const deleted = await db
      .delete(roundsPS)
      .where(and(eq(roundsPS.roundId, targetRoundId), eq(roundsPS.tabId, tabId)))
      .returning({
        roundId: roundsPS.roundId,
        name: roundsPS.name,
        tabId: roundsPS.tabId,
        breaks: roundsPS.breaks,
        completed: roundsPS.completed,
        speechDuration: roundsPS.speechDuration,
      });

    if (!deleted.length) {
      return res.status(404).json({ message: 'Round not deleted' });
    }

    await rebuildStandingsForTab(tabId);

    return res.status(200).json({ message: 'Round removed successfully', data: deleted[0] });
  } catch (error) {
    console.error('ps deleteRound error:', error);
    return res.status(500).json({ message: 'failed to delete round' });
  }
}

export async function addPrompt(req: Request, res: Response) {
  try {
    const { speechPrompt, speechType, roundId, tabId, visible } = req.body as {
      speechPrompt?: string;
      speechType?: string;
      roundId?: number | string;
      tabId?: string;
      visible?: boolean | string;
    };

    const normalizedPrompt = speechPrompt?.trim();
    const normalizedType = speechType?.trim().toLowerCase();
    const parsedRoundId = parsePositiveIntOrNull(roundId);
    const parsedVisible = parseBooleanInput(visible) ?? false;

    if (!normalizedPrompt || !normalizedType || !tabId || parsedRoundId === null || Number.isNaN(parsedRoundId)) {
      return res.status(400).json({ message: 'speechPrompt, speechType, roundId and tabId are required' });
    }
    if (!allowedSpeechTypes.has(normalizedType)) {
      return res.status(400).json({ message: 'Invalid speech type' });
    }
    if (!(await ensureRoundExists(tabId, parsedRoundId))) {
      return res.status(404).json({ message: 'Round not found in this tab' });
    }

    const [roundPrompt]=await db
      .select({id:speechPromptsPS.roundId})
      .from(speechPromptsPS)
      .where(and(eq(speechPromptsPS.roundId, parsedRoundId), eq(speechPromptsPS.tabId, tabId)));
    if(roundPrompt) return res.status(400).json({message:'Round already has a prompt. Update or choose a different round'});

    const created = await db
      .insert(speechPromptsPS)
      .values({
        tabId,
        roundId: parsedRoundId,
        speechPrompt: normalizedPrompt,
        speechType: normalizedType as any,
        visible: parsedVisible,
      })
      .returning({
        id: speechPromptsPS.promptId,
        roundId: speechPromptsPS.roundId,
        speechPrompt: speechPromptsPS.speechPrompt,
        speechType: speechPromptsPS.speechType,
        visible: speechPromptsPS.visible,
        tabId: speechPromptsPS.tabId,
      });

    return res.status(201).json({ message: 'Speech prompt added successfully', data: created[0] });
  } catch (error) {
    console.error('ps addPrompt error:', error);
    return res.status(500).json({ message: 'failed to add speech prompt' });
  }
}

export async function updatePrompt(req: Request, res: Response) {
  try {
    const { id, promptId, speechPrompt, speechType, roundId, tabId, visible } = req.body as {
      id?: number;
      promptId?: number;
      speechPrompt?: string;
      speechType?: string;
      roundId?: number | string;
      tabId?: string;
      visible?: boolean | string;
    };

    const targetPromptId = promptId ?? id;
    const normalizedPrompt = speechPrompt?.trim();
    const normalizedType = speechType?.trim().toLowerCase();
    const parsedRoundId = parsePositiveIntOrNull(roundId);
    const parsedVisible = parseBooleanInput(visible);

    if (!targetPromptId || !tabId || !normalizedPrompt || !normalizedType || parsedRoundId === null || Number.isNaN(parsedRoundId)) {
      return res.status(400).json({ message: 'prompt id, speechPrompt, speechType, roundId and tabId are required' });
    }
    if (!allowedSpeechTypes.has(normalizedType)) {
      return res.status(400).json({ message: 'Invalid speech type' });
    }
    if (!(await ensureRoundExists(tabId, parsedRoundId))) {
      return res.status(404).json({ message: 'Round not found in this tab' });
    }

    const updated = await db
      .update(speechPromptsPS)
      .set({
        roundId: parsedRoundId,
        speechPrompt: normalizedPrompt,
        speechType: normalizedType as any,
        visible: parsedVisible ?? false,
      })
      .where(and(eq(speechPromptsPS.promptId, targetPromptId), eq(speechPromptsPS.tabId, tabId)))
      .returning({
        id: speechPromptsPS.promptId,
        roundId: speechPromptsPS.roundId,
        speechPrompt: speechPromptsPS.speechPrompt,
        speechType: speechPromptsPS.speechType,
        visible: speechPromptsPS.visible,
        tabId: speechPromptsPS.tabId,
      });

    if (!updated.length) {
      return res.status(404).json({ message: 'Speech prompt not found' });
    }

    return res.status(200).json({ message: 'Speech prompt updated successfully', data: updated[0] });
  } catch (error) {
    console.error('ps updatePrompt error:', error);
    return res.status(500).json({ message: 'failed to update speech prompt' });
  }
}

export async function deletePrompt(req: Request, res: Response) {
  try {
    const { id, promptId, tabId } = req.body as {
      id?: number;
      promptId?: number;
      tabId?: string;
    };
    const targetPromptId = promptId ?? id;
    if (!targetPromptId || !tabId) {
      return res.status(400).json({ message: 'promptId and tabId are required' });
    }

    const deleted = await db
      .delete(speechPromptsPS)
      .where(and(eq(speechPromptsPS.promptId, targetPromptId), eq(speechPromptsPS.tabId, tabId)))
      .returning({
        id: speechPromptsPS.promptId,
        roundId: speechPromptsPS.roundId,
        speechPrompt: speechPromptsPS.speechPrompt,
      });

    if (!deleted.length) {
      return res.status(404).json({ message: 'Speech prompt not found' });
    }

    return res.status(200).json({ message: 'Speech prompt removed successfully', data: deleted[0] });
  } catch (error) {
    console.error('ps deletePrompt error:', error);
    return res.status(500).json({ message: 'failed to delete speech prompt' });
  }
}
