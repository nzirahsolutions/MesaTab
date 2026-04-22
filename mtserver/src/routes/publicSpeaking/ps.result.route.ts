import { Router } from 'express';
import * as psResultsController from '../../controllers/publicSpeaking/ps.results.controller';

const router = Router();

router.post('/ballot', psResultsController.ballot);
router.post('/batch', psResultsController.batchBallot);
router.delete('/ballot', psResultsController.deleteBallot);

export default router;
