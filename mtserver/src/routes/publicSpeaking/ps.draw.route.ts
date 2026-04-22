import { Router } from 'express';
import * as psDrawController from '../../controllers/publicSpeaking/ps.draw.controller';

const router = Router();

router.post('/generate', psDrawController.generateDraw);
router.post('/update', psDrawController.updateDraw);
router.post('/breaks', psDrawController.generateBreaks);
router.post('/break-generate', psDrawController.generateBreakDraw);
router.delete('/delete', psDrawController.deleteDraw);

export default router;
