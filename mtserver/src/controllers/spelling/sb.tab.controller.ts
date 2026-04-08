import { Request, Response } from "express";
import { and, asc, eq, inArray } from "drizzle-orm";
import { db } from "../../db/db";
import { tabsSB,tabsBP,tabsChess,tabsPS,tabsWSDC, cupCategoriesSB, institutionsSB, spellers,tabMastersSB, roomsSB, roundsSB, judgesSB, wordsSB, drawsSB, drawJudgesSB, drawSpellers, resultsSB, standingsSB} from "../../db/schema";
import { rebuildStandingsForTab } from "./sb.results.controller";

type cup={
  id?: number | string | null;
  cupCategory: string;
  cupOrder: number | string;
  breakNumber: number | string;
  breakCapacity: number | string;
}

type normalizedCup = {
  id: number | null;
  cupCategory: string;
  cupOrder: number;
  breakNumber: number;
  breakCapacity: number;
}

function parseBooleanInput(value: unknown): boolean | undefined {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") {
    if (value.toLowerCase() === "true") return true;
    if (value.toLowerCase() === "false") return false;
  }
  return undefined;
}

function parseIntOrNull(value: unknown): number | null {
  if (value === undefined) return null;
  if (value === null || value === "") return null;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1) return Number.NaN;
  return parsed;
}

function validateRoundShape(type: unknown, timeLimit: number | null, wordLimit: number | null) {
  if (type !== "Timed" && type !== "Word Limit" && type !== "Eliminator") {
    return { ok: false as const, message: "Invalid round type" };
  }
  if (type === "Timed") {
    if (!timeLimit) return { ok: false as const, message: "timeLimit is required for Timed rounds" };
    return { ok: true as const, timeLimit, wordLimit: null };
  }
  if (type === "Word Limit") {
    if (!wordLimit) return { ok: false as const, message: "wordLimit is required for Word Limit rounds" };
    return { ok: true as const, timeLimit: null, wordLimit };
  }
  return { ok: true as const, timeLimit: null, wordLimit: null };
}

const allowedBreakPhases = new Set(['Triples','Doubles','Octos','Quarters','Semis','Finals']);
const allBreakPhases = ['Triples','Doubles','Octos','Quarters','Semis','Finals'] as const;

function getBreakPhases(breakNumber: number) {
  if (breakNumber < 1 || breakNumber > allBreakPhases.length) {
    throw new Error("breakNumber must be between 1 and 6");
  }  
  return allBreakPhases.slice(allBreakPhases.length - breakNumber);
}


//tab
export async function getFullTab(req: Request, res: Response) {
  try {
    const { tabId } = req.params as { tabId?: string };

    if (!tabId) {
      return res.status(400).json({ message: "tabId is required" });
    }

    const tabRow = await db
      .select({
        tabId: tabsSB.tabId,
        eventId: tabsSB.eventId,
        title: tabsSB.title,
        slug: tabsSB.slug,
        track: tabsSB.track,
        completed: tabsSB.completed,
      })
      .from(tabsSB)
      .where(eq(tabsSB.tabId, tabId))
      .limit(1);

    if (!tabRow.length) {
      return res.status(404).json({ message: "Tab not found" });
    }

    const tab = tabRow[0];

    const [institutionsRow, cups,spellingBees, judges, tabMasters, rooms, rounds, words, draws, standingsRows] =
      await Promise.all([
        db
          .select({
            id: institutionsSB.institutionId,
            name: institutionsSB.name,
            code: institutionsSB.code,
          })
          .from(institutionsSB)
          .where(eq(institutionsSB.tabId, tab.tabId)),

        db
          .select({
            id: cupCategoriesSB.cupCategoryId,
            cupCategory: cupCategoriesSB.cupCategory,
            breakCapacity: cupCategoriesSB.breakCapacity,
            breakNumber: cupCategoriesSB.breakNumber,
            cupOrder:cupCategoriesSB.cupOrder,
          })
          .from(cupCategoriesSB)
          .where(eq(cupCategoriesSB.tabId, tab.tabId))
          .orderBy(asc(cupCategoriesSB.cupOrder), asc(cupCategoriesSB.cupCategoryId)),

        db
          .select({
            id: spellers.spellerId,
            name: spellers.name,
            email: spellers.email,
            institutionId: spellers.institutionId,
            available: spellers.available,
          })
          .from(spellers)
          .where(eq(spellers.tabId, tab.tabId)),

        db
          .select({
            id: judgesSB.judgeId,
            name: judgesSB.name,
            email: judgesSB.email,
            institutionId: judgesSB.institutionId,
            available: judgesSB.available,
          })
          .from(judgesSB)
          .where(eq(judgesSB.tabId, tab.tabId)),
        db
          .select({
            id: tabMastersSB.tabMasterId,
            name: tabMastersSB.name,
            email: tabMastersSB.email,
            institutionId: tabMastersSB.institutionId,
          })
          .from(tabMastersSB)
          .where(eq(tabMastersSB.tabId, tab.tabId)),

        db
          .select({
            id: roomsSB.roomId,
            name: roomsSB.name,
            available: roomsSB.available,
          })
          .from(roomsSB)
          .where(eq(roomsSB.tabId, tab.tabId)),

        db
          .select({
            roundId: roundsSB.roundId,
            name: roundsSB.name,
            number: roundsSB.number,
            breaks: roundsSB.breaks,
            completed: roundsSB.completed,
            cupCategoryId: roundsSB.cupCategoryId,
            breakPhase: roundsSB.breakPhase,
            blind: roundsSB.blind,
            type: roundsSB.type,
            timeLimit: roundsSB.timeLimit,
            wordLimit: roundsSB.wordLimit,
          })
          .from(roundsSB)
          .where(eq(roundsSB.tabId, tab.tabId))
          .orderBy(asc(roundsSB.number), asc(roundsSB.roundId)),
        db
          .select({
            id: wordsSB.wordId,
            word: wordsSB.word,
          })
          .from(wordsSB)
          .where(eq(wordsSB.tabId, tab.tabId)),
        db
          .select({
            drawId: drawsSB.drawId,
            roundId: drawsSB.roundId,
            roomId: drawsSB.roomId,
          })
          .from(drawsSB)
          .where(eq(drawsSB.tabId, tab.tabId))
          .orderBy(asc(drawsSB.roundId), asc(drawsSB.roomId)),
        db
          .select({
            standingId: standingsSB.standingId,
            spellerId: standingsSB.spellerId,
            totalScore: standingsSB.totalScore,
            roundScores: standingsSB.roundScores,
            rank: standingsSB.rank,
            updatedAt: standingsSB.updatedAt,
          })
          .from(standingsSB)
          .where(eq(standingsSB.tabId, tab.tabId)),

      ]);
      const institutions= institutionsRow.map((i)=>({
        id: i.id,
        name: i.name,
        code: i.code,
        spellers: spellingBees.filter((s)=>s.institutionId===i.id).length,
      }))

      const drawIds=draws.map((d) => d.drawId);
      const [drawSpellerRows, drawJudgeRows] = drawIds.length? 
      await Promise.all([
          db
            .select({
              drawSpellerId: drawSpellers.id,
              drawId: drawSpellers.drawId,
              spellerId: drawSpellers.spellerId,
            })
            .from(drawSpellers)
            .where(inArray(drawSpellers.drawId, drawIds)),

          db
            .select({
              drawId: drawJudgesSB.drawId,
              judgeId: drawJudgesSB.judgeId,
            })
            .from(drawJudgesSB)
            .where(inArray(drawJudgesSB.drawId, drawIds)),
        ])
      : [[], []];
    
    const hasBlindPrelims=rounds.filter(r=>r.breaks===false).some(r=>r.blind);
    
    //fetch results per speller draw
    const drawSpellerIds = drawSpellerRows.map((r) => r.drawSpellerId);
    const resultsRows = drawSpellerIds.length
    ? await db
        .select({
          drawSpellerId: resultsSB.drawSpellerId,
          resultId: resultsSB.resultId,
          score: resultsSB.score,
          status: resultsSB.status,
          createdAt: resultsSB.createdAt,
          updatedAt: resultsSB.updatedAt,
        })
        .from(resultsSB)
        .where(inArray(resultsSB.drawSpellerId, drawSpellerIds))
    : [];
    
      //build maps and shape nested draws (help return all info by either participant id or draw id, results by drawspeller id)
    const spellerById = new Map(spellingBees.map((s) => [s.id, s]));
    const judgeById = new Map(judges.map((j) => [j.id, j]));
    const roomById = new Map(rooms.map((r) => [r.id, r]));
    const resultByDrawSpellerId = new Map( resultsRows.map((r) => [r.drawSpellerId, r]));

    const spellersByDraw = new Map<number, { drawSpellerId: number; spellerId: number }[]>();
    for (const r of drawSpellerRows) {
      const list = spellersByDraw.get(r.drawId) ?? [];
      list.push({ drawSpellerId: r.drawSpellerId, spellerId: r.spellerId });
      spellersByDraw.set(r.drawId, list);
    }

    const judgesByDraw = new Map<number, number[]>();
    for (const r of drawJudgeRows) {
      const list = judgesByDraw.get(r.drawId) ?? [];
      list.push(r.judgeId);
      judgesByDraw.set(r.drawId, list)};

    const drawsDetailed = draws.map((d) => ({
      drawId: d.drawId,
      roundId: d.roundId,
      room: roomById.get(d.roomId) ?? null,
      judges: (judgesByDraw.get(d.drawId) ?? [])
        .map((id) => judgeById.get(id))
        .filter(Boolean),
      spellers: (spellersByDraw.get(d.drawId) ?? [])
      .map(({ drawSpellerId, spellerId }) => {
        const speller = spellerById.get(spellerId);
        if (!speller) return null;
        return {
          ...speller,
          drawSpellerId,
          result: resultByDrawSpellerId.get(drawSpellerId) ?? null,
        };
      })
        .filter(Boolean),
    }));

    const standingsRaw = standingsRows
      .map((standing) => {
        const speller = spellerById.get(standing.spellerId);
        if (!speller) return null;

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
          roundScores,
          updatedAt: standing.updatedAt,
          speller: {
            id: speller.id,
            name: speller.name,
            email: speller.email,
            institutionId: speller.institutionId,
          },
        };
      })
      .filter(Boolean);
    //
    const standings= hasBlindPrelims? 
    standingsRaw.sort((a,b)=>
      (a?.speller.name?? '').localeCompare(b?.speller.name??'')
    )
    : standingsRaw.sort((a,b)=>{
      const rankA=a?.rank?? Number.MAX_SAFE_INTEGER;
      const rankB=b?.rank?? Number.MAX_SAFE_INTEGER;
      return rankA-rankB;
    });

    return res.status(200).json({
      message: "Tab fetched successfully",
      data: {
        tabID: tab.tabId,
        eventID: tab.eventId,
        track: tab.track,
        title: tab.title,
        slug: tab.slug,
        completed:tab.completed,
        institutions,
        cups,
        spellingBees,
        judges,
        tabMasters,
        rooms,
        rounds,
        words,
        draws: drawsDetailed,
        standings,
      },
    });
  } catch (error) {
    console.error("getFullTab error:", error);
    return res.status(500).json({ message: "failed to fetch tab" });
  }
}
export async function updateTab(req:Request, res: Response){
  try {
    const {title, slug, tabId, cups, completed}=req.body as{
      title: string;
      slug: string;
      tabId: string;
      completed: boolean;
      cups: cup[];
    }
    const normalizedTitle = title?.trim();
    const normalizedSlug = slug?.toLowerCase().trim();
    if(!normalizedTitle || !normalizedSlug || !Array.isArray(cups) || cups.length===0)
      return res.status(400).json({message:'title and slug must not be empty. Add at least one cup'});

    const normalizedCupCandidates = cups.map((cup) => {
      const parsedCupOrder = parseIntOrNull(cup.cupOrder);
      const parsedBreakNumber = parseIntOrNull(cup.breakNumber);
      const parsedBreakCapacity = parseIntOrNull(cup.breakCapacity);
      const parsedId =
        cup.id === undefined || cup.id === null || cup.id === ""
          ? null
          : Number(cup.id);

      return {
        id: parsedId,
        cupCategory: String(cup.cupCategory ?? "").trim(),
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
          cup.id !== null && (!Number.isInteger(cup.id) || cup.id < 1)
      )
    ) {
      return res.status(400).json({
        message:'Cup names must not be empty and cup ids, cupOrder, breakNumber, and breakCapacity must be positive integers',
      });
    }

    const normalizedCups: normalizedCup[] = normalizedCupCandidates.map((cup) => ({
      id: cup.id,
      cupCategory: cup.cupCategory,
      cupOrder: cup.cupOrder as number,
      breakNumber: cup.breakNumber as number,
      breakCapacity: cup.breakCapacity as number,
    }));

    const seenCupNames = new Set<string>();
    const seenCupOrders = new Set<number>();
    for (const cup of normalizedCups) {
      const cupNameKey = cup.cupCategory.toLocaleLowerCase();
      if (seenCupNames.has(cupNameKey)) {
        return res.status(409).json({message:'Cup names must be unique in a tab'});
      }
      if (seenCupOrders.has(cup.cupOrder)) {
        return res.status(409).json({message:'Cup orders must be unique in a tab'});
      }
      seenCupNames.add(cupNameKey);
      seenCupOrders.add(cup.cupOrder);
    }

    //check if tab exists
    const exists= await db
        .select({tabId: tabsSB.tabId, title: tabsSB.title, slug: tabsSB.slug, eventId: tabsSB.eventId, completed: tabsSB.completed})
        .from(tabsSB)
        .where(eq(tabsSB.tabId, tabId))
        .limit(1);
    if(!exists.length) return res.status(404).json({message:'Tab not found'});

    //ensure slug is unique in event
    if(exists[0].slug!==normalizedSlug){
      const tabTables = [tabsBP, tabsWSDC, tabsPS, tabsSB, tabsChess] as const;
        const existingTabChecks = await Promise.all(
          tabTables.map((table) =>
            db
              .select({ slug: table.slug })
              .from(table)
              .where(and(eq(table.slug, normalizedSlug), eq(table.eventId, exists[0].eventId)))
              .limit(1)
          )
        );
        if (existingTabChecks.some((rows) => rows.length > 0)) {
          return res.status(409).json({ message: "You already have a tab with that slug in this event" });
        }
    }

    const updatedData = await db.transaction(async (tx) => {
      const [updatedTab] = await tx
        .update(tabsSB)
        .set({
          title: normalizedTitle,
          slug: normalizedSlug,
          completed: completed,
        })
        .where(eq(tabsSB.tabId, tabId))
        .returning({tabId: tabsSB.tabId, title: tabsSB.title, slug: tabsSB.slug, completed: tabsSB.completed});

      if(!updatedTab) throw new Error('Tab update failed');
      
      if(!updatedTab.completed){
      const existingCups = await tx
        .select({
          id: cupCategoriesSB.cupCategoryId,
          cupCategory: cupCategoriesSB.cupCategory,
          cupOrder: cupCategoriesSB.cupOrder,
          breakNumber: cupCategoriesSB.breakNumber,
          breakCapacity: cupCategoriesSB.breakCapacity,
        })
        .from(cupCategoriesSB)
        .where(eq(cupCategoriesSB.tabId, tabId))
        .orderBy(asc(cupCategoriesSB.cupOrder), asc(cupCategoriesSB.cupCategoryId));

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
          .select({
            roundId: roundsSB.roundId,
            roundName: roundsSB.name,
            cupCategoryId: roundsSB.cupCategoryId,
          })
          .from(roundsSB)
          .where(
            and(
              eq(roundsSB.tabId, tabId),
              inArray(roundsSB.cupCategoryId, cupsToDelete.map((cup) => cup.id))
            )
          );

        if (referencedRounds.length) {
          const blockedCupIds = new Set(referencedRounds.map((round) => round.cupCategoryId));
          const blockedCups = cupsToDelete
            .filter((cup) => blockedCupIds.has(cup.id))
            .map((cup) => cup.cupCategory)
            .filter(Boolean);
          throw new Error(`Cannot delete cups still used by rounds: ${blockedCups.join(', ')}`);
        }

        await tx
          .delete(cupCategoriesSB)
          .where(inArray(cupCategoriesSB.cupCategoryId, cupsToDelete.map((cup) => cup.id)));
      }

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
            .update(cupCategoriesSB)
            .set({
              cupCategory: cup.cupCategory,
              cupOrder: cup.cupOrder,
              breakNumber: cup.breakNumber,
              breakCapacity: cup.breakCapacity,
            })
            .where(and(eq(cupCategoriesSB.tabId, tabId), eq(cupCategoriesSB.cupCategoryId, cup.id)))
            .returning({
              id: cupCategoriesSB.cupCategoryId,
              cupCategory: cupCategoriesSB.cupCategory,
              cupOrder: cupCategoriesSB.cupOrder,
              breakNumber: cupCategoriesSB.breakNumber,
              breakCapacity: cupCategoriesSB.breakCapacity,
            });
          savedCups.push(updatedCup);
          continue;
        }

        const [newCup] = await tx
          .insert(cupCategoriesSB)
          .values({
            tabId,
            cupCategory: cup.cupCategory,
            cupOrder: cup.cupOrder,
            breakNumber: cup.breakNumber,
            breakCapacity: cup.breakCapacity,
          })
          .returning({
            id: cupCategoriesSB.cupCategoryId,
            cupCategory: cupCategoriesSB.cupCategory,
            cupOrder: cupCategoriesSB.cupOrder,
            breakNumber: cupCategoriesSB.breakNumber,
            breakCapacity: cupCategoriesSB.breakCapacity,
          });
        savedCups.push(newCup);
      }

      savedCups.sort((a, b) => a.cupOrder - b.cupOrder || a.id - b.id);

    //automatically add break rounds
    const existingBreakRounds = await tx
      .select({
        roundId: roundsSB.roundId,
        cupCategoryId: roundsSB.cupCategoryId,
        breakPhase: roundsSB.breakPhase,
        name: roundsSB.name,
        number: roundsSB.number,
      })
      .from(roundsSB)
      .where(and(eq(roundsSB.tabId, tabId), eq(roundsSB.breaks, true)))
      .orderBy(asc(roundsSB.number), asc(roundsSB.roundId));

    const existingPrelimRounds = await tx
      .select({
        roundId: roundsSB.roundId,
        number: roundsSB.number,
      })
      .from(roundsSB)
      .where(and(eq(roundsSB.tabId, tabId), eq(roundsSB.breaks, false)))
      .orderBy(asc(roundsSB.number), asc(roundsSB.roundId));

    let nextBreakRoundNumber = existingPrelimRounds.length
      ? existingPrelimRounds[existingPrelimRounds.length - 1].number + 1
      : 1;

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
          .insert(roundsSB)
          .values({
            tabId,
            name: expectedRound.name,
            number: expectedRound.number,
            breaks: true,
            cupCategoryId: expectedRound.cupCategoryId,
            breakPhase: expectedRound.breakPhase,
            completed: false,
            type: "Eliminator",
            timeLimit: null,
            wordLimit: null,
            blind: false,
          });
        continue;
      }

      await tx
        .update(roundsSB)
        .set({
          name: expectedRound.name,
          number: existingRound.number,
          breaks: true,
          cupCategoryId: expectedRound.cupCategoryId,
          breakPhase: expectedRound.breakPhase,
          type: "Eliminator",
          timeLimit: null,
          wordLimit: null,
          blind: false,
        })
        .where(eq(roundsSB.roundId, existingRound.roundId));
    }
    //to remove break rounds that are no longer needed when a cup’s breakNumber decreases
    for (const existingRound of existingBreakRounds) {
        if (!existingRound.cupCategoryId || !existingRound.breakPhase) continue;

        const key = `${existingRound.cupCategoryId}:${existingRound.breakPhase}`;
        if (expectedBreakRoundKeys.has(key)) continue;

        await tx
          .delete(roundsSB)
          .where(eq(roundsSB.roundId, existingRound.roundId));
      }
      return {
        tab: updatedTab,
        cups: savedCups,
        };
      }
    else{ //lock tab rounds
      const locked= await tx
        .update(roundsSB)
        .set({completed: true, blind: false})
        .where(eq(roundsSB.tabId, tabId))
        .returning({roundId: roundsSB.roundId, name: roundsSB.name});
      
      if(!locked.length) throw new Error("Couldn't lock rounds");
    }
    });
    

    return res.status(200).json({
      message:'tab updated successfully',
      data: updatedData,
    });    
  } 
  catch (error) {
        console.error("updateTab error:", error);
        const message = error instanceof Error ? error.message : "failed to update Tab";
        if (
          message === 'One or more cups do not belong to this tab' ||
          message.startsWith('Cannot delete cups still used by rounds:') ||
          message === 'Cup orders must be unique in a tab' ||
          message.startsWith('Duplicate expected break round') ||
          message.startsWith('Break round number collision')
        ) {
          return res.status(409).json({ message });
        }
        if (
          message.includes('cupTabUnique') ||
          message.includes('cup_categories_sb_tab_id_cup_category') ||
          message.includes('cup_categories_sb_tab_id_cup_order')
        ) {
          return res.status(409).json({ message: 'Cup names and cup orders must be unique in a tab' });
        }
        if (message.includes('breakNumber must be between')) {
          return res.status(400).json({ message });
        }
        if (message.includes("Couldn't")) {
          return res.status(409).json({ message });
        }
        return res.status(500).json({ message: "failed to update"});
    }
}
//institution
export async function addInstitution(req: Request, res: Response) {
    // console.log('Add institution');
    try {
        const {name, code, tabId}=req.body as {
            name: string;
            code: string;
            tabId: string;
        }
        const normalizedCode=code.trim().toUpperCase();
        
        if (!name || !normalizedCode || !tabId) {
            return res
            .status(400)
            .json({ message: "School name and code are required" });
        }
        const existing = await db
                    .select({ code: institutionsSB.code })
                    .from(institutionsSB)
                    .where(and(eq(institutionsSB.code, normalizedCode),eq(institutionsSB.tabId, tabId)))
                    .limit(1);
      
        if (existing.length > 0) {
            return res.status(409).json({ message: "Institute code is already in tab" });
        }

        //confirm tab isn't completed
        const [tab]= await db
          .select({completed: tabsSB.completed})
          .from(tabsSB)
          .where(eq(tabsSB.tabId, tabId));
        
        if(tab.completed) return res.status(400).json({message:'Tab marked as completed'});
        
        const added = await db
            .insert(institutionsSB)
            .values({
            name: name,
            code: normalizedCode,
            tabId: tabId,
            })
            .returning({
            name: institutionsSB.name,
            code: institutionsSB.code,
            tabId: institutionsSB.tabId,
            });

        const addedInstitution = added[0];

        return res.status(201).json({
            message: "Institution Added Successfully",
            data: addedInstitution,
        });
        
    } 
    catch(error){
        console.error("addInstitution error:", error);
        return res.status(500).json({ message: "failed to add Instituition" });
    }
}
export async function updateInstitution(req: Request, res: Response) {
    // console.log('Update Institution');
    try {
        const {name, code, tabId, id}=req.body as {
            name: string;
            code: string;
            tabId: string;
            id: number;
        }

        if((!name && !code) || !tabId || !id)
            return res.status(400).json({message:'Provide at least code  or name'});
        const updates:{name?: string; code?: string}={};
        if(name) updates.name=name;
        if(code) updates.code=code.trim().toUpperCase();

        //confirm tab isn't completed
        const [tab]= await db
          .select({completed: tabsSB.completed})
          .from(tabsSB)
          .where(eq(tabsSB.tabId, tabId));
        
        if(tab.completed) return res.status(400).json({message:'Tab marked as completed'});

        //ensure code is unique in the same tab
        if(updates.code){
          const existing=await db
            .select({id: institutionsSB.institutionId})
            .from(institutionsSB)
            .where(and(eq(institutionsSB.tabId, tabId),eq(institutionsSB.code,updates.code )))
            .limit(1);
            if(existing.length && existing[0].id !==id){
              return res.status(409).json({message:'Instituion code is already in tab'});
            }
        }
        const updated= await db
        .update(institutionsSB)
        .set(updates)
        .where(and(eq(institutionsSB.tabId, tabId),eq(institutionsSB.institutionId, id)))
        .returning({
          institutionId: institutionsSB.institutionId,
          name: institutionsSB.name,
          code: institutionsSB.code,
          tabId: institutionsSB.tabId,
        });
        if(!updated.length) return res.status(404).json({message:'Institution not found'});

        return res.status(200).json({message:'Institution updated successfully',
          data: updated[0],
        })

    } 
    catch(error){
    console.error("updateInstitution error:", error);
    return res.status(500).json({ message: "failed to update Instituition" });
    }
}
export async function deleteInstitution(req: Request, res: Response) {
    try {
      // console.log(req.body);
      const {id, tabId}=req.body as{
        id?: number;
        tabId?: string;
      }
      if(!id || !tabId) res.status(400).json({message:'id and tabId required'});
    
    // // Optional: prevent delete if spellers/judges still reference this institution
    // const spellerCount = await db
    //   .select({ id: spellers.spellerId })
    //   .from(spellers)
    //   .where(eq(spellers.institutionId, id))
    //   .limit(1);

    // const judgeCount = await db
    //   .select({ id: judgesSB.judgeId })
    //   .from(judgesSB)
    //   .where(eq(judgesSB.institutionId, id))
    //   .limit(1);

    // if (spellerCount.length || judgeCount.length) {
    //   return res.status(409).json({
    //     message: "Cannot delete institution with linked spellers or judges",
    //   });
    // }

    //confirm tab isn't completed
    const [tab]= await db
      .select({completed: tabsSB.completed})
      .from(tabsSB)
      .where(eq(tabsSB.tabId, tabId));
    
    if(tab.completed) return res.status(400).json({message:'Tab marked as completed'});

    const deleted = await db
      .delete(institutionsSB)
      .where(and(
        eq(institutionsSB.institutionId, id),
        eq(institutionsSB.tabId, tabId)
      ))
      .returning({
        institutionId: institutionsSB.institutionId,
        name: institutionsSB.name,
        code: institutionsSB.code,
        tabId: institutionsSB.tabId,
      });

    if (!deleted.length) {
      return res.status(404).json({ message: "Institution not found" });
    }

    return res.status(200).json({
      message: "Institution deleted successfully",
      data: deleted[0],
    });
    } 
    catch(error){
    console.error("deleteInstitution error:", error);
    return res.status(500).json({ message: "failed to delete Instituition" });
    }
}
//speller
export async function addSpeller(req: Request, res: Response) {
    // console.log('Add institution');
    try {
        const {name, email, tabId, institutionId}=req.body as {
            name?: string;
            email?: string;
            tabId?: string;
            institutionId?: number;
        }
        const normalizedEmail=email?.trim().toLowerCase();       
        if (!name || !institutionId || !tabId) {
            return res
            .status(400)
            .json({ message: "Speller name and institution are required" });
        }
        // console.log('Email:',normalizedEmail);
        if(normalizedEmail){
          const existing = await db
                    .select({ email: spellers.email })
                    .from(spellers)
                    .where(and(eq(spellers.email, normalizedEmail),eq(spellers.tabId, tabId)))
                    .limit(1);
      
        if (existing.length > 0) {
            return res.status(409).json({ message: "Student with that email is already in tab" });
        }}

        //confirm tab isn't completed
        const [tab]= await db
          .select({completed: tabsSB.completed})
          .from(tabsSB)
          .where(eq(tabsSB.tabId, tabId));
        
        if(tab.completed) return res.status(400).json({message:'Tab marked as completed'});

        const added = await db
            .insert(spellers)
            .values({
            name: name,
            email: normalizedEmail? normalizedEmail:null,
            tabId: tabId,
            institutionId: institutionId
            })
            .returning({
            name: spellers.name,
            email: spellers.email,
            tabId: spellers.tabId,
            institutionId: spellers.institutionId
            });

        const addedSpeller = added[0];
        await rebuildStandingsForTab(tabId);

        return res.status(201).json({
            message: "Speller Registered Successfully",
            data: addedSpeller,
        });
        
    } 
    catch(error)
    {
    console.error("addSpeller error:", error);
    return res.status(500).json({ message: "failed to add speller" });
    }
}
export async function updateSpeller(req: Request, res: Response) {
    // console.log('Update Institution');
    try {
        const {name, email, tabId, id, institutionId, available}=req.body as {
            name: string;
            email: string;
            tabId: string;
            id: number;
            institutionId: number;
            available: boolean;
        }

        if((!id && !tabId) || !tabId || !id)
            return res.status(400).json({message:'Provide tabId and spellerId'});

        //confirm tab isn't completed
        const [tab]= await db
          .select({completed: tabsSB.completed})
          .from(tabsSB)
          .where(eq(tabsSB.tabId, tabId));
        
        if(tab.completed) return res.status(400).json({message:'Tab marked as completed'});

        const updates:{name?: string; email?: string, institutionId?:number, available?: boolean}={};
        if(name) updates.name=name;
        if(email) updates.email=email.trim().toLocaleLowerCase();
        if(institutionId) updates.institutionId=institutionId;
        updates.available=available;

        //ensure email is unique in the same tab
        if(updates.email){
          const existing=await db
            .select({id: spellers.spellerId})
            .from(spellers)
            .where(and(eq(spellers.tabId, tabId),eq(spellers.email,updates.email )))
            .limit(1);
            if(existing.length && existing[0].id !==id){
              return res.status(409).json({message:'Student with that email is already in tab'});
            }
        }
        const updated= await db
        .update(spellers)
        .set(updates)
        .where(and(eq(spellers.tabId, tabId),eq(spellers.spellerId, id)))
        .returning({
          spellerId: spellers.spellerId,
          name: spellers.name,
          email: spellers.email,
          institutionId: spellers.institutionId,
          tabId: spellers.tabId,
          available: spellers.available,
        });
        if(!updated.length) return res.status(404).json({message:'Speller not found'});

        return res.status(200).json({message:'Speller updated successfully',
          data: updated[0],
        })
    } 
    catch(error){
    console.error("updateSpeller error:", error);
    return res.status(500).json({ message: "failed to update speller" });
    }
}
export async function deleteSpeller(req: Request, res: Response) {
    try {
      // console.log(req.body);
      const {id, tabId}=req.body as{
        id?: number;
        tabId?: string;
      }
      if(!id || !tabId) res.status(400).json({message:'id and tabId required'});

        //confirm tab isn't completed
        const [tab]= await db
          .select({completed: tabsSB.completed})
          .from(tabsSB)
          .where(eq(tabsSB.tabId, tabId));
        
        if(tab.completed) return res.status(400).json({message:'Tab marked as completed'});

    const deleted = await db
      .delete(spellers)
      .where(and(
        eq(spellers.spellerId, id),
        eq(spellers.tabId, tabId)
      ))
      .returning({
        spellerId: spellers.spellerId,
        name: spellers.name,
        email: spellers.email,
        institutionId: spellers.institutionId,
        tabId: spellers.tabId,
      });

    if (!deleted.length) {
      return res.status(404).json({ message: "Speller not found" });
    }

    return res.status(200).json({
      message: "Speller removed successfully",
      data: deleted[0],
    });
    } 
    catch(error){
    console.error("deleteSpeller error:", error);
    return res.status(500).json({ message: "failed to delete speller" });
    }
}
//tabMasters
export async function addTabMaster(req: Request, res: Response) {
    try {
        const {name, email, tabId, institutionId}=req.body as {
            name?: string;
            email?: string;
            tabId?: string;
            institutionId?: number;
        }
        const normalizedEmail=email?.trim().toLocaleLowerCase();
        if (!name || !normalizedEmail || !institutionId || !tabId) {
            return res
            .status(400)
            .json({ message: "Tab master name, email and institution are required" });
        }

        //confirm tab isn't completed
        const [tab]= await db
          .select({completed: tabsSB.completed})
          .from(tabsSB)
          .where(eq(tabsSB.tabId, tabId));
        
        if(tab.completed) return res.status(400).json({message:'Tab marked as completed'});
        const existing = await db
                    .select({ email: tabMastersSB.email })
                    .from(tabMastersSB)
                    .where(and(eq(tabMastersSB.email, normalizedEmail),eq(tabMastersSB.tabId, tabId)))
                    .limit(1);
      
        if (existing.length > 0) {
            return res.status(409).json({ message: "Tab master with that email is already in tab" });
        }
        const added = await db
            .insert(tabMastersSB)
            .values({
            name: name,
            email: normalizedEmail,
            tabId: tabId,
            institutionId: institutionId
            })
            .returning({
            id: tabMastersSB.tabMasterId,
            name: tabMastersSB.name,
            email: tabMastersSB.email,
            tabId: tabMastersSB.tabId,
            institutionId: tabMastersSB.institutionId
            });

        return res.status(201).json({
            message: "Tab Master Added Successfully",
            data: added[0],
        });
    } 
    catch(error){
    console.error("addTabMaster error:", error);
    return res.status(500).json({ message: "failed to add Tab Master" });
    }
}
export async function updateTabMaster(req: Request, res: Response) {
    try {
        const {name, email, tabId, id, institutionId}=req.body as {
            name?: string;
            email?: string;
            tabId?: string;
            id?: number;
            institutionId?: number;
        }

        if(!tabId || !id)
            return res.status(400).json({message:'Provide tabId and tabMasterId'});

        //confirm tab isn't completed
        const [tab]= await db
          .select({completed: tabsSB.completed})
          .from(tabsSB)
          .where(eq(tabsSB.tabId, tabId));
        
        if(tab.completed) return res.status(400).json({message:'Tab marked as completed'});

        const updates:{name?: string; email?: string; institutionId?:number}={};
        if(name) updates.name=name;
        if(email) updates.email=email.trim().toLocaleLowerCase();
        if(institutionId) updates.institutionId=institutionId;

        if(updates.email){
          const existing=await db
            .select({id: tabMastersSB.tabMasterId})
            .from(tabMastersSB)
            .where(and(eq(tabMastersSB.tabId, tabId),eq(tabMastersSB.email,updates.email )))
            .limit(1);
            if(existing.length && existing[0].id !==id){
              return res.status(409).json({message:'Tab master with that email is already in tab'});
            }
        }
        const updated= await db
        .update(tabMastersSB)
        .set(updates)
        .where(and(eq(tabMastersSB.tabId, tabId),eq(tabMastersSB.tabMasterId, id)))
        .returning({
          id: tabMastersSB.tabMasterId,
          name: tabMastersSB.name,
          email: tabMastersSB.email,
          institutionId: tabMastersSB.institutionId,
          tabId: tabMastersSB.tabId,
        });
        if(!updated.length) return res.status(404).json({message:'Tab Master not found'});

        return res.status(200).json({
          message:'Tab Master updated successfully',
          data: updated[0],
        });
    } 
    catch(error){
    console.error("updateTabMaster error:", error);
    return res.status(500).json({ message: "failed to update Tab Master" });
    }
}
export async function deleteTabMaster(req: Request, res: Response) {
    try {
      const {id, tabId}=req.body as{
        id?: number;
        tabId?: string;
      }
      if(!id || !tabId) return res.status(400).json({message:'id and tabId required'});

      //confirm tab isn't completed
      const [tab]= await db
        .select({completed: tabsSB.completed})
        .from(tabsSB)
        .where(eq(tabsSB.tabId, tabId));
      
      if(tab.completed) return res.status(400).json({message:'Tab marked as completed'});

      const deleted = await db
        .delete(tabMastersSB)
        .where(and(
          eq(tabMastersSB.tabMasterId, id),
          eq(tabMastersSB.tabId, tabId)
        ))
        .returning({
          id: tabMastersSB.tabMasterId,
          name: tabMastersSB.name,
          email: tabMastersSB.email,
          institutionId: tabMastersSB.institutionId,
          tabId: tabMastersSB.tabId,
        });

      if (!deleted.length) {
        return res.status(404).json({ message: "Tab Master not found" });
      }

      return res.status(200).json({
        message: "Tab Master removed successfully",
        data: deleted[0],
      });
    } 
    catch(error){
    console.error("deleteTabMaster error:", error);
    return res.status(500).json({ message: "failed to delete Tab Master" });
    }
}
//judge
export async function addJudge(req: Request, res: Response) {
    try {
        const {name, email, tabId, institutionId}=req.body as {
            name?: string;
            email?: string;
            tabId?: string;
            institutionId?: number;
        }
        const normalizedEmail=email?.trim().toLocaleLowerCase();
        if (!name || !institutionId || !tabId) {
            return res
            .status(400)
            .json({ message: "Judge name and institution are required" });
        }
        if (normalizedEmail) {
          const existing = await db
                      .select({ email: judgesSB.email })
                      .from(judgesSB)
                      .where(and(eq(judgesSB.email, normalizedEmail),eq(judgesSB.tabId, tabId)))
                      .limit(1);
        
          if (existing.length > 0) {
              return res.status(409).json({ message: "Judge with that email is already in tab" });
          }
        }

        //confirm tab isn't completed
        const [tab]= await db
          .select({completed: tabsSB.completed})
          .from(tabsSB)
          .where(eq(tabsSB.tabId, tabId));
        
        if(tab.completed) return res.status(400).json({message:'Tab marked as completed'});
        const added = await db
            .insert(judgesSB)
            .values({
            name: name,
            email: normalizedEmail? normalizedEmail:null,
            tabId: tabId,
            institutionId: institutionId
            })
            .returning({
            id: judgesSB.judgeId,
            name: judgesSB.name,
            email: judgesSB.email,
            tabId: judgesSB.tabId,
            institutionId: judgesSB.institutionId
            });

        return res.status(201).json({
            message: "Judge Added Successfully",
            data: added[0],
        });
    } 
    catch(error){
    console.error("addJudge error:", error);
    return res.status(500).json({ message: "failed to add judge" });
    }
}
export async function updateJudge(req: Request, res: Response) {
    try {
        const {name, email, tabId, id, institutionId, available}=req.body as {
            name?: string;
            email?: string;
            tabId?: string;
            id?: number;
            institutionId?: number;
            available?: boolean;
        }

        if(!tabId || !id)
            return res.status(400).json({message:'Provide tabId and judgeId'});

        //confirm tab isn't completed
        const [tab]= await db
          .select({completed: tabsSB.completed})
          .from(tabsSB)
          .where(eq(tabsSB.tabId, tabId));
        
        if(tab.completed) return res.status(400).json({message:'Tab marked as completed'});

        const updates:{name?: string; email?: string; institutionId?:number; available?:boolean;}={};
        if(name) updates.name=name;
        if(email) updates.email=email.trim().toLocaleLowerCase();
        if(institutionId) updates.institutionId=institutionId;
        updates.available=available;

        if(updates.email){
          const existing=await db
            .select({id: judgesSB.judgeId})
            .from(judgesSB)
            .where(and(eq(judgesSB.tabId, tabId),eq(judgesSB.email,updates.email )))
            .limit(1);
            if(existing.length && existing[0].id !==id){
              return res.status(409).json({message:'Judge with that email is already in tab'});
            }
        }
        const updated= await db
        .update(judgesSB)
        .set(updates)
        .where(and(eq(judgesSB.tabId, tabId),eq(judgesSB.judgeId, id)))
        .returning({
          id: judgesSB.judgeId,
          name: judgesSB.name,
          email: judgesSB.email,
          institutionId: judgesSB.institutionId,
          tabId: judgesSB.tabId,
          available: judgesSB.available,
        });
        if(!updated.length) return res.status(404).json({message:'Judge not found'});

        return res.status(200).json({
          message:'Judge updated successfully',
          data: updated[0],
        });
    } 
    catch(error){
    console.error("updateJudge error:", error);
    return res.status(500).json({ message: "failed to update judge" });
    }
}
export async function deleteJudge(req: Request, res: Response) {
    try {
      const {id, tabId}=req.body as{
        id?: number;
        tabId?: string;
      }
      if(!id || !tabId) return res.status(400).json({message:'id and tabId required'});

        //confirm tab isn't completed
        const [tab]= await db
          .select({completed: tabsSB.completed})
          .from(tabsSB)
          .where(eq(tabsSB.tabId, tabId));
        
        if(tab.completed) return res.status(400).json({message:'Tab marked as completed'});

      const deleted = await db
        .delete(judgesSB)
        .where(and(
          eq(judgesSB.judgeId, id),
          eq(judgesSB.tabId, tabId)
        ))
        .returning({
          id: judgesSB.judgeId,
          name: judgesSB.name,
          email: judgesSB.email,
          institutionId: judgesSB.institutionId,
          tabId: judgesSB.tabId,
        });

      if (!deleted.length) {
        return res.status(404).json({ message: "Judge not found" });
      }

      return res.status(200).json({
        message: "Judge removed successfully",
        data: deleted[0],
      });
    } 
    catch(error){
    console.error("deleteJudge error:", error);
    return res.status(500).json({ message: "failed to delete judge" });
    }
}
//room
export async function addRoom(req: Request, res: Response) {
    try {
        const {name, tabId, available}=req.body as {
            name?: string;
            tabId?: string;
            available?: boolean;
        }
        const normalizedName=name?.trim();
        if (!normalizedName || !tabId) {
            return res.status(400).json({ message: "Room name and tabId are required" });
        }
        const existing = await db
                    .select({ id: roomsSB.roomId })
                    .from(roomsSB)
                    .where(and(eq(roomsSB.name, normalizedName),eq(roomsSB.tabId, tabId)))
                    .limit(1);
      
        if (existing.length > 0) {
            return res.status(409).json({ message: "Room with that name is already in tab" });
        }

        //confirm tab isn't completed
        const [tab]= await db
          .select({completed: tabsSB.completed})
          .from(tabsSB)
          .where(eq(tabsSB.tabId, tabId));
        
        if(tab.completed) return res.status(400).json({message:'Tab marked as completed'});
        const added = await db
            .insert(roomsSB)
            .values({
            name: normalizedName,
            tabId: tabId,
            available: available,
            })
            .returning({
            id: roomsSB.roomId,
            name: roomsSB.name,
            tabId: roomsSB.tabId,
            });

        return res.status(201).json({
            message: "Room Added Successfully",
            data: added[0],
        });
    } 
    catch(error){
    console.error("addRoom error:", error);
    return res.status(500).json({ message: "failed to add room" });
    }
}
export async function updateRoom(req: Request, res: Response) {
    try {
        const {name, tabId, id, available}=req.body as {
            name?: string;
            tabId?: string;
            id?: number;
            available?: boolean;
        }

        if(!tabId || !id)
            return res.status(400).json({message:'Provide tabId and roomId'});

        //confirm tab isn't completed
        const [tab]= await db
          .select({completed: tabsSB.completed})
          .from(tabsSB)
          .where(eq(tabsSB.tabId, tabId));
        
        if(tab.completed) return res.status(400).json({message:'Tab marked as completed'});

        const updates:{name?: string, available?:boolean}={};
        if(name) updates.name=name.trim();
        updates.available=available;

        if(updates.name){
          const existing=await db
            .select({id: roomsSB.roomId})
            .from(roomsSB)
            .where(and(eq(roomsSB.tabId, tabId),eq(roomsSB.name,updates.name )))
            .limit(1);
            if(existing.length && existing[0].id !==id){
              return res.status(409).json({message:'Room with that name is already in tab'});
            }
        }
        const updated= await db
        .update(roomsSB)
        .set(updates)
        .where(and(eq(roomsSB.tabId, tabId),eq(roomsSB.roomId, id)))
        .returning({
          id: roomsSB.roomId,
          name: roomsSB.name,
          tabId: roomsSB.tabId,
        });
        if(!updated.length) return res.status(404).json({message:'Room not found'});

        return res.status(200).json({
          message:'Room updated successfully',
          data: updated[0],
        });
    } 
    catch(error){
    console.error("updateRoom error:", error);
    return res.status(500).json({ message: "failed to update room" });
    }
}
export async function deleteRoom(req: Request, res: Response) {
    try {
      const {id, tabId}=req.body as{
        id?: number;
        tabId?: string;
      }
      if(!id || !tabId) return res.status(400).json({message:'id and tabId required'});

        //confirm tab isn't completed
        const [tab]= await db
          .select({completed: tabsSB.completed})
          .from(tabsSB)
          .where(eq(tabsSB.tabId, tabId));
        
        if(tab.completed) return res.status(400).json({message:'Tab marked as completed'});

      const deleted = await db
        .delete(roomsSB)
        .where(and(
          eq(roomsSB.roomId, id),
          eq(roomsSB.tabId, tabId)
        ))
        .returning({
          id: roomsSB.roomId,
          name: roomsSB.name,
          tabId: roomsSB.tabId,
        });

      if (!deleted.length) {
        return res.status(404).json({ message: "Room not found" });
      }

      return res.status(200).json({
        message: "Room removed successfully",
        data: deleted[0],
      });
    } 
    catch(error){
    console.error("deleteRoom error:", error);
    return res.status(500).json({ message: "failed to delete room" });
    }
}
//round
export async function addRound(req: Request, res: Response) {
    try {
        const {
          name,
          tabId,
          number,
          type,
          breaks,
          timeLimit,
          wordLimit,
          blind,
          breakPhase,
          breakCategory,
        }=req.body as {
            name?: number | string | null;
            tabId?: string;
            number?: number | string | null;
            type?: string;
            breaks?: boolean | string;
            blind?: boolean | string;
            timeLimit?: number | string | null;
            wordLimit?: number | string | null;
            breakPhase?: string;
            breakCategory?: number | string | null;
        }

        if (!name || !tabId || !type) {
            return res.status(400).json({ message: "Round name, tabId and type are required" });
        }

        //confirm tab isn't completed
        const [tab]= await db
          .select({completed: tabsSB.completed})
          .from(tabsSB)
          .where(eq(tabsSB.tabId, tabId));
        
        if(tab.completed) return res.status(400).json({message:'Tab marked as completed'});

        const parsedBreaks = parseBooleanInput(breaks) ?? false;
        const parsedBlind = parseBooleanInput(blind) ?? false;
        const normalizedBreakPhase = breakPhase?.trim() || null;
        const parsedBreakCategory = parseIntOrNull(breakCategory);

        const parsedName = parseIntOrNull(name);
        const parsedNumber = parseIntOrNull(number);
        const parsedTime = parseIntOrNull(timeLimit);
        const parsedWord = parseIntOrNull(wordLimit);
        if (
          Number.isNaN(parsedName) ||
          Number.isNaN(parsedNumber) ||
          Number.isNaN(parsedBreakCategory) ||
          Number.isNaN(parsedTime) ||
          Number.isNaN(parsedWord)
        ) {
          return res.status(400).json({ message: "Round numeric fields must be positive integers" });
        }
        const normalizedName= 'Round '+name;
        if (parsedBreaks) {
          if (!normalizedBreakPhase || parsedBreakCategory === null) {
            return res.status(400).json({ message: "choose break phase and break category" });
          }

          if (!allowedBreakPhases.has(normalizedBreakPhase)) {
            return res.status(400).json({ message: "Invalid break phase" });
          }
        }

        const validated = validateRoundShape(type, parsedTime, parsedWord);
        if (!validated.ok) return res.status(400).json({ message: validated.message });

        if (parsedBreakCategory !== null) {
          const existingBreakCategory = await db
            .select({ id: cupCategoriesSB.cupCategoryId })
            .from(cupCategoriesSB)
            .where(and(eq(cupCategoriesSB.tabId, tabId), eq(cupCategoriesSB.cupCategoryId, parsedBreakCategory)))
            .limit(1);

          if (!existingBreakCategory.length) {
            return res.status(404).json({ message: "Break category not found in this tab" });
          }
        }

        let targetNumber = parsedNumber;
        if (targetNumber === null) {
          const existingRounds = await db
            .select({ number: roundsSB.number })
            .from(roundsSB)
            .where(eq(roundsSB.tabId, tabId))
            .orderBy(asc(roundsSB.number));
          targetNumber = existingRounds.length ? existingRounds[existingRounds.length - 1].number + 1 : 1;
        }
        //keep round number unique
        const existingRoundNumber=await db
          .select({ number: roundsSB.number })
            .from(roundsSB)
            .where(and(eq(roundsSB.tabId, tabId),eq(roundsSB.number, targetNumber)));

        if(existingRoundNumber.length)
          return res.status(409).json({ message: "Round number already exists in this tab" });

        const added = await db
          .insert(roundsSB)
          .values({
            name: normalizedName,
            tabId,
            number: targetNumber,
            breaks: parsedBreaks,
            blind: parsedBlind,
            cupCategoryId: parsedBreaks ? parsedBreakCategory : null,
            breakPhase: parsedBreaks
              ? normalizedBreakPhase as "Octo-Finals" | "Quarter-Finals" | "Semi-Finals" | "Finals"
              : null,
            type: type as "Timed" | "Word Limit" | "Eliminator",
            timeLimit: validated.timeLimit,
            wordLimit: validated.wordLimit,
          })
          .returning({
            roundId: roundsSB.roundId,
            name: roundsSB.name,
            tabId: roundsSB.tabId,
            number: roundsSB.number,
            breaks: roundsSB.breaks,
            blind: roundsSB.blind,
            cupCategoryId: roundsSB.cupCategoryId,
            breakPhase: roundsSB.breakPhase,
            completed: roundsSB.completed,
            type: roundsSB.type,
            timeLimit: roundsSB.timeLimit,
            wordLimit: roundsSB.wordLimit,
          });

        return res.status(201).json({
          message: "Round Added Successfully",
          data: added[0],
        });
    } 
    catch(error){
    console.error("addRound error:", error);
    const message = error instanceof Error ? error.message : "failed to add round";
    if (
      message.includes("tab_round_number_unique") ||
      message.includes("rounds_sb_tab_id_number")
    ) {
      return res.status(409).json({ message: "Round number already exists in this tab" });
    }
    if (
      message.includes("tabCupBreakPhaseUnique") ||
      message.includes("rounds_sb_tab_id_break_phase_cup_category_id")
    ) {
      return res.status(409).json({ message: "That break phase already exists for the selected cup in this tab" });
    }
    return res.status(500).json({ message: "failed to add round" });
    }
}
export async function updateRound(req: Request, res: Response) {
    try {
        const {
          id,
          roundId,
          tabId,
          name,
          number,
          type,
          breaks,
          completed,
          blind,
          timeLimit,
          wordLimit,
          breakPhase,
          breakCategory,
        }=req.body as {
            id?: number;
            roundId?: number;
            tabId?: string;
            name?: string;
            number?: number | string | null;
            type?: string;
            breaks?: boolean | string;
            completed?: boolean | string;
            blind?: boolean | string;
            timeLimit?: number | string | null;
            wordLimit?: number | string | null;
            breakPhase?: string;
            breakCategory?: number | string | null;
        }
        const targetRoundId = roundId ?? id;
        if(!tabId || !targetRoundId){
            return res.status(400).json({message:'Provide tabId and roundId'});
        }

        //confirm tab isn't completed
        const [tab]= await db
          .select({completed: tabsSB.completed})
          .from(tabsSB)
          .where(eq(tabsSB.tabId, tabId));
        
        if(tab.completed) return res.status(400).json({message:'Tab marked as completed'});

        const existing = await db
          .select({
            roundId: roundsSB.roundId,
            name: roundsSB.name,
            number: roundsSB.number,
            breaks: roundsSB.breaks,
            completed: roundsSB.completed,
            blind: roundsSB.blind,
            cupCategoryId: roundsSB.cupCategoryId,
            breakPhase: roundsSB.breakPhase,
            type: roundsSB.type,
            timeLimit: roundsSB.timeLimit,
            wordLimit: roundsSB.wordLimit,
          })
          .from(roundsSB)
          .where(and(eq(roundsSB.tabId, tabId), eq(roundsSB.roundId, targetRoundId)))
          .limit(1);
        if (!existing.length) return res.status(404).json({ message: "Round not found" });

        if(existing[0].number!==parseIntOrNull(number)){const existingRoundNumber=await db
          .select({ number: roundsSB.number })
            .from(roundsSB)
            .where(and(eq(roundsSB.tabId, tabId),eq(roundsSB.number, number), eq(roundsSB.cupCategoryId, existing[0].cupCategoryId)));

        if(existingRoundNumber.length)
          return res.status(409).json({ message: "Round number already exists in this tab and/or cup" });
        }

        const prev = existing[0];
        const nextType = type ?? prev.type;
        const nextBreaks = parseBooleanInput(breaks) ?? prev.breaks;
        const nextCompleted = parseBooleanInput(completed) ?? prev.completed;
        const nextBlind = parseBooleanInput(blind) ?? prev.blind;
        const nextName = name?.trim() || prev.name;
        const normalizedBreakPhase = breakPhase?.trim() || null;
        const parsedBreakCategory = parseIntOrNull(breakCategory);

        const parsedNumber = parseIntOrNull(number);
        const parsedTime = parseIntOrNull(timeLimit);
        const parsedWord = parseIntOrNull(wordLimit);
        if (
          Number.isNaN(parsedNumber) ||
          Number.isNaN(parsedBreakCategory) ||
          Number.isNaN(parsedTime) ||
          Number.isNaN(parsedWord)
        ) {
          return res.status(400).json({ message: "Round numeric fields must be positive integers" });
        }

        const nextNumber = number !== undefined ? parsedNumber ?? prev.number : prev.number;
        const proposedTime = timeLimit !== undefined ? parsedTime ?? null : prev.timeLimit;
        const proposedWord = wordLimit !== undefined ? parsedWord ?? null : prev.wordLimit;
        const nextBreakPhase = nextBreaks
          ? breakPhase !== undefined
            ? normalizedBreakPhase
            : prev.breakPhase
          : null;
        const nextBreakCategory = nextBreaks
          ? breakCategory !== undefined
            ? parsedBreakCategory
            : prev.cupCategoryId
          : null;

        if (nextBreaks) {
          if (!nextBreakPhase || nextBreakCategory === null) {
            return res.status(400).json({ message: "choose break phase and break category" });
          }

          if (!allowedBreakPhases.has(nextBreakPhase)) {
            return res.status(400).json({ message: "Invalid break phase" });
          }
        }

        const validated = validateRoundShape(nextType, proposedTime, proposedWord);
        if (!validated.ok) return res.status(400).json({ message: validated.message });

        if (nextBreakCategory !== null) {
          const existingBreakCategory = await db
            .select({ id: cupCategoriesSB.cupCategoryId })
            .from(cupCategoriesSB)
            .where(and(eq(cupCategoriesSB.tabId, tabId), eq(cupCategoriesSB.cupCategoryId, nextBreakCategory)))
            .limit(1);

          if (!existingBreakCategory.length) {
            return res.status(404).json({ message: "Break category not found in this tab" });
          }
        }

        const updated= await db
        .update(roundsSB)
        .set({
          name: nextName,
          number: nextNumber,
          breaks: nextBreaks,
          completed: nextCompleted,
          blind: nextBlind,
          cupCategoryId: nextBreakCategory,
          breakPhase: nextBreakPhase as "Octo-Finals" | "Quarter-Finals" | "Semi-Finals" | "Finals" | null,
          type: nextType as "Timed" | "Word Limit" | "Eliminator",
          timeLimit: validated.timeLimit,
          wordLimit: validated.wordLimit,
        })
        .where(and(eq(roundsSB.tabId, tabId),eq(roundsSB.roundId, targetRoundId)))
        .returning({
          roundId: roundsSB.roundId,
          name: roundsSB.name,
          tabId: roundsSB.tabId,
          number: roundsSB.number,
          breaks: roundsSB.breaks,
          completed: roundsSB.completed,
          blind: roundsSB.blind,
          cupCategoryId: roundsSB.cupCategoryId,
          breakPhase: roundsSB.breakPhase,
          type: roundsSB.type,
          timeLimit: roundsSB.timeLimit,
          wordLimit: roundsSB.wordLimit,
        });

        return res.status(200).json({
          message:'Round updated successfully',
          data: updated[0],
        });
    } 
    catch(error){
    console.error("updateRound error:", error);
    const message = error instanceof Error ? error.message : "failed to update round";
    if (
      message.includes("tab_round_number_unique") ||
      message.includes("rounds_sb_tab_id_number")
    ) {
      return res.status(409).json({ message: "Round number already exists in this tab" });
    }
    if (
      message.includes("tabCupBreakPhaseUnique") ||
      message.includes("rounds_sb_tab_id_break_phase_cup_category_id")
    ) {
      return res.status(409).json({ message: "That break phase already exists for the selected cup in this tab" });
    }
    return res.status(500).json({ message: "failed to update round" });
    }
}
export async function deleteRound(req: Request, res: Response) {
    try {
      const {id, roundId, tabId}=req.body as{
        id?: number;
        roundId?: number;
        tabId?: string;
      }
      const targetRoundId = roundId ?? id;
      if(!targetRoundId || !tabId) return res.status(400).json({message:'roundId and tabId required'});

      const [round]= await db
        .select({roundId: roundsSB.roundId, completed: roundsSB.completed})
        .from(roundsSB)
        .where(and(
          eq(roundsSB.roundId, targetRoundId),
          eq(roundsSB.tabId, tabId)
        ));
      if(!round)
        return res.status(404).json({message:'Round not found on tab'});
      if(round.completed)
        return res.status(409).json({message:'Round marked as completed on tab'});

        //confirm tab isn't completed
        const [tab]= await db
          .select({completed: tabsSB.completed})
          .from(tabsSB)
          .where(eq(tabsSB.tabId, tabId));
        
        if(tab.completed) return res.status(400).json({message:'Tab marked as completed'});
        
      const deleted = await db
        .delete(roundsSB)
        .where(and(
          eq(roundsSB.roundId, targetRoundId),
          eq(roundsSB.tabId, tabId)
        ))
        .returning({
          roundId: roundsSB.roundId,
          name: roundsSB.name,
          tabId: roundsSB.tabId,
          breaks: roundsSB.breaks,
          completed: roundsSB.completed,
          type: roundsSB.type,
          timeLimit: roundsSB.timeLimit,
          wordLimit: roundsSB.wordLimit,
        });

      if (!deleted.length) {
        return res.status(404).json({ message: "Round not deleted" });
      }

      await rebuildStandingsForTab(tabId);

      return res.status(200).json({
        message: "Round removed successfully",
        data: deleted[0],
      });
    } 
    catch(error){
    console.error("deleteRound error:", error);
    return res.status(500).json({ message: "failed to delete round" });
    }
}
//word
export async function addWord(req: Request, res: Response) {
    try {
        const {word, tabId}=req.body as {
            word?: string;
            tabId?: string;
        }
        const normalizedWord=word?.trim();
        if (!normalizedWord || !tabId) {
            return res.status(400).json({ message: "Word and tabId are required" });
        }

        //confirm tab isn't completed
        const [tab]= await db
          .select({completed: tabsSB.completed})
          .from(tabsSB)
          .where(eq(tabsSB.tabId, tabId));
        
        if(tab.completed) return res.status(400).json({message:'Tab marked as completed'});

        const existing = await db
                    .select({ id: wordsSB.wordId })
                    .from(wordsSB)
                    .where(and(eq(wordsSB.word, normalizedWord),eq(wordsSB.tabId, tabId)))
                    .limit(1);
      
        if (existing.length > 0) {
            return res.status(409).json({ message: "Word already exists in tab" });
        }
        const added = await db
            .insert(wordsSB)
            .values({
            word: normalizedWord,
            tabId: tabId,
            })
            .returning({
            id: wordsSB.wordId,
            word: wordsSB.word,
            tabId: wordsSB.tabId,
            });

        return res.status(201).json({
            message: "Word Added Successfully",
            data: added[0],
        });
    } 
    catch(error){
    console.error("addWord error:", error);
    return res.status(500).json({ message: "failed to add word" });
    }
}
export async function updateWord(req: Request, res: Response) {
    try {
      const {id, tabId, word}=req.body as{
        id?: number;
        tabId?: string;
        word?: string;
      }
      const normalizedWord = word?.trim();
      if(!id || !tabId || !normalizedWord) return res.status(400).json({message:'id, tabId and word required'});

        //confirm tab isn't completed
        const [tab]= await db
          .select({completed: tabsSB.completed})
          .from(tabsSB)
          .where(eq(tabsSB.tabId, tabId));
        
        if(tab.completed) return res.status(400).json({message:'Tab marked as completed'});

      const existing=await db
        .select({id: wordsSB.wordId})
        .from(wordsSB)
        .where(and(eq(wordsSB.tabId, tabId),eq(wordsSB.word, normalizedWord )))
        .limit(1);
      if(existing.length && existing[0].id !==id){
        return res.status(409).json({message:'Word already exists in tab'});
      }

      const updated = await db
        .update(wordsSB)
        .set({ word: normalizedWord })
        .where(and(
          eq(wordsSB.wordId, id),
          eq(wordsSB.tabId, tabId)
        ))
        .returning({
          id: wordsSB.wordId,
          word: wordsSB.word,
          tabId: wordsSB.tabId,
        });

      if (!updated.length) {
        return res.status(404).json({ message: "Word not found" });
      }

      return res.status(200).json({
        message: "Word updated successfully",
        data: updated[0],
      });
    } 
    catch(error){
    console.error("updateWord error:", error);
    return res.status(500).json({ message: "failed to update word" });
    }
}
export async function deleteWord(req: Request, res: Response) {
    try {
      const {id, tabId}=req.body as{
        id?: number;
        tabId?: string;
      }
      if(!id || !tabId) return res.status(400).json({message:'id and tabId required'});

        //confirm tab isn't completed
        const [tab]= await db
          .select({completed: tabsSB.completed})
          .from(tabsSB)
          .where(eq(tabsSB.tabId, tabId));
        
        if(tab.completed) return res.status(400).json({message:'Tab marked as completed'});

      const deleted = await db
        .delete(wordsSB)
        .where(and(
          eq(wordsSB.wordId, id),
          eq(wordsSB.tabId, tabId)
        ))
        .returning({
          id: wordsSB.wordId,
          word: wordsSB.word,
          tabId: wordsSB.tabId,
        });

      if (!deleted.length) {
        return res.status(404).json({ message: "Word not found" });
      }

      return res.status(200).json({
        message: "Word removed successfully",
        data: deleted[0],
      });
    } 
    catch(error){
    console.error("deletWord error:", error);
    return res.status(500).json({ message: "failed to delete word" });
    }
}
