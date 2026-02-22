import { Router, Request, Response } from 'express';
import { db } from '../../db/db';
import { resultsSB, standingsSB } from '../../db/schema';
import { eq } from 'drizzle-orm';
import { updateStandingsForSpeller, getStandingsForTab,} from '../../services/standings.service';

const router = Router();

/**
 * POST /api/results
 * Create a new result and update standings
 */
router.post('/results', async (req: Request, res: Response) => {
  try {
    const { drawSpellerId, score, status } = req.body;

    // Validate input
    if (!drawSpellerId || (score === undefined && !status)) {
      return res.status(400).json({
        error: 'drawSpellerId and either score or status are required',
      });
    }

    // Insert result
    const result = await db
      .insert(resultsSB)
      .values({
        drawSpellerId,
        score: score || null,
        status: status || null,
      })
      .returning();

    // Update standings (only if score, not for elimination rounds)
    if (score !== undefined && score !== null) {
      await updateStandingsForSpeller(drawSpellerId);
    }

    return res.status(201).json(result[0]);
  } catch (error) {
    console.error('Error creating result:', error);
    return res.status(500).json({ error: 'Failed to create result' });
  }
});

/**
 * PUT /api/results/:resultId
 * Update a result and recalculate standings
 */
router.put('/results/:resultId', async (req: Request, res: Response) => {
  try {
    const { resultId } = req.params;
    const { score, status } = req.body;

    if (!resultId) {
      return res.status(400).json({ error: 'resultId is required' });
    }

    // Get the existing result to find the drawSpellerId
    const existingResult = await db
      .select()
      .from(resultsSB)
      .where(eq(resultsSB.resultId, parseInt(resultId)))
      .limit(1);

    if (!existingResult.length) {
      return res.status(404).json({ error: 'Result not found' });
    }

    const drawSpellerId = existingResult[0].drawSpellerId;

    // Update result
    const updated = await db
      .update(resultsSB)
      .set({
        score: score !== undefined ? score : existingResult[0].score,
        status: status !== undefined ? status : existingResult[0].status,
      })
      .where(eq(resultsSB.resultId, parseInt(resultId)))
      .returning();

    // Recalculate standings
    if (score !== undefined) {
      await updateStandingsForSpeller(drawSpellerId);
    }

    return res.json(updated[0]);
  } catch (error) {
    console.error('Error updating result:', error);
    return res.status(500).json({ error: 'Failed to update result' });
  }
});

/**
 * GET /api/standings/:tabId
 * Get standings for a specific tab
 */
router.get('/standings/:tabId', async (req: Request, res: Response) => {
  try {
    const { tabId } = req.params;

    if (!tabId) {
      return res.status(400).json({ error: 'tabId is required' });
    }

    const standings = await getStandingsForTab(tabId);

    return res.json(standings);
  } catch (error) {
    console.error('Error fetching standings:', error);
    return res.status(500).json({ error: 'Failed to fetch standings' });
  }
});

export default router;
