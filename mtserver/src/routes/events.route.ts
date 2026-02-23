import { Router } from "express";
import * as eventsController from '../controllers/events.controller';

const router= Router();

router.post('/', eventsController.createEvent);

export default router;