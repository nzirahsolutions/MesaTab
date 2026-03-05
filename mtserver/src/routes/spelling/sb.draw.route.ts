import { Router } from "express";
import * as sbDrawController from '../../controllers/spelling/sb.draw.controller';

const router= Router();

router.post('/generate', sbDrawController.generateDraw);
router.post('/breaks', sbDrawController.generateBreaks);
router.put('/update', sbDrawController.updateDraw);
router.delete('/delete', sbDrawController.deleteDraw);

export default router;