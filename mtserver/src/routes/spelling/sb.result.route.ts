import { Router } from "express";
import * as sbResultsController from '../../controllers/spelling/sb.results.controller';

const router= Router();

router.post('/ballot', sbResultsController.ballot);
router.post("/batch", sbResultsController.batchBallot);
router.delete('/ballot', sbResultsController.deleteBallot);

export default router;