import { Router } from "express";
import * as eventsController from '../controllers/events.controller';

const router= Router();

router.post('/', eventsController.createEvent);
router.get('/:ownerId', eventsController.getUserEvents);
router.get('/find/:slug', eventsController.findEvent);

export default router;