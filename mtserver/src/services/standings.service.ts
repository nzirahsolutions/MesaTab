import { db } from '../db/db';
import {standingsSB, resultsSB, drawSpellers, drawsSB, roundsSB, spellers,} from '../db/schema';
import { eq, and, sql, desc } from 'drizzle-orm';

/**
 * Update standings for a specific speller in a tab
 * Called when a result is inserted or updated
 */
export async function updateStandingsForSpeller(drawSpellerId: number) {
  try {
    // Get the speller and tab info from the draw_speller
    const drawSpellerRecord = await db
      .select()
      .from(drawSpellers)
      .where(eq(drawSpellers.id, drawSpellerId))
      .leftJoin(spellers, eq(drawSpellers.spellerId, spellers.spellerId))
      .limit(1)
      .then((result) => result[0]);

    if (!drawSpellerRecord) {
      console.warn(`Draw speller with id ${drawSpellerId} not found`);
      return;
    }

    const tabId = drawSpellerRecord.draw_spellers.tabId;
    const spellerId = drawSpellerRecord.draw_spellers.spellerId;

    // Calculate round scores for this speller
    const roundScoresData = await db
      .select({
        roundId: roundsSB.roundId,
        roundName: roundsSB.name,
        score: resultsSB.score,
      })
      .from(drawSpellers)
      .innerJoin(drawsSB, eq(drawSpellers.drawId, drawsSB.drawId))
      .innerJoin(roundsSB, eq(drawsSB.roundId, roundsSB.roundId))
      .leftJoin(resultsSB, eq(drawSpellers.id, resultsSB.drawSpellerId))
      .where(
        and(
          eq(drawSpellers.spellerId, spellerId),
          eq(drawSpellers.tabId, tabId),
          eq(roundsSB.breaks, false),
          eq(roundsSB.completed, true)
        )
      )
      .orderBy(roundsSB.roundId);

    // Sum scores
    const totalScore = roundScoresData.reduce((sum, r) => sum + (r.score || 0), 0);

    // Format round scores as JSON
    const roundScoresJson = JSON.stringify(
      roundScoresData
        .filter((r) => r.score !== null)
        .map((r) => ({
          round_id: r.roundId,
          round_name: r.roundName,
          score: r.score,
        }))
    );

    // Upsert into standings table
    await db
      .insert(standingsSB)
      .values({
        tabId,
        spellerId,
        totalScore,
        roundScores: roundScoresJson,
        rank: 1, // Will be recalculated below
      })
      .onConflictDoUpdate({
        target: [standingsSB.tabId, standingsSB.spellerId],
        set: {
          totalScore,
          roundScores: roundScoresJson,
          updatedAt: new Date().toISOString(),
        },
      });

    // Recalculate ranks for all spellers in this tab
    await recalculateRanks(tabId);

    console.log(
      `Updated standings for speller ${spellerId} in tab ${tabId}`
    );
  } catch (error) {
    console.error(`Error updating standings for draw speller ${drawSpellerId}:`, error);
    throw error;
  }
}

/**
 * Recalculate ranks for all spellers in a tab
 */
async function recalculateRanks(tabId: string) {
  try {
    // Get all standings for this tab, ordered by total_score DESC
    const standings = await db
      .select()
      .from(standingsSB)
      .where(eq(standingsSB.tabId, tabId))
      .orderBy(desc(standingsSB.totalScore));

    // Update ranks batched (more efficient)
    if (standings.length > 0) {
      // Create case statement for efficient batch update
      const cases = standings
        .map((s, idx) => `WHEN ${s.standingId} THEN ${idx + 1}`)
        .join(' ');

      const standingIds = standings.map((s) => s.standingId);

      await db
        .update(standingsSB)
        .set({
          rank: sql`CASE standing_id ${sql.raw(cases)} END`,
        })
        .where(sql`standing_id IN (${sql.join(standingIds, sql`,`)})`);
    }

    console.log(`Recalculated ranks for tab ${tabId}`);
  } catch (error) {
    console.error(`Error recalculating ranks for tab ${tabId}:`, error);
    throw error;
  }
}

/**
 * Get standings for a specific tab
 */
export async function getStandingsForTab(tabId: string) {
  const standings = await db
    .select()
    .from(standingsSB)
    .where(eq(standingsSB.tabId, tabId))
    .orderBy(standingsSB.rank);

  // Parse JSON round scores
  return standings.map((s) => ({
    ...s,
    roundScores: s.roundScores ? JSON.parse(s.roundScores) : [],
  }));
}

/**
 * Initialize standings for a speller joining a tab
 * Call when a new speller is added to a tab
 */
export async function initializeStandingsForSpeller(
  tabId: string,
  spellerId: number
) {
  try {
    // Insert empty standing with 0 score
    await db
      .insert(standingsSB)
      .values({
        tabId,
        spellerId,
        totalScore: 0,
        roundScores: JSON.stringify([]),
        rank: 999, // Will be recalculated
      })
      .onConflictDoNothing();

    // Recalculate ranks
    await recalculateRanks(tabId);

    console.log(`Initialized standings for speller ${spellerId} in tab ${tabId}`);
  } catch (error) {
    console.error(
      `Error initializing standings for speller ${spellerId} in tab ${tabId}:`,
      error
    );
    throw error;
  }
}

/**
 * Delete standings for a speller (when they're removed from the tab)
 */
export async function deleteStandingsForSpeller(
  tabId: string,
  spellerId: number
) {
  try {
    await db
      .delete(standingsSB)
      .where(
        and(
          eq(standingsSB.tabId, tabId),
          eq(standingsSB.spellerId, spellerId)
        )
      );

    // Recalculate ranks for remaining spellers
    await recalculateRanks(tabId);

    console.log(
      `Deleted standings for speller ${spellerId} from tab ${tabId}`
    );
  } catch (error) {
    console.error(
      `Error deleting standings for speller ${spellerId} from tab ${tabId}:`,
      error
    );
    throw error;
  }
}
