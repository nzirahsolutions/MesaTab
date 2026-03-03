import { Router } from "express";
import * as sbDrawController from '../../controllers/spelling/sb.draw.controller';

const router= Router();

router.post('/generate', sbDrawController.generateDraw);
router.post('/breaks', sbDrawController.generateBreaks);

export default router;