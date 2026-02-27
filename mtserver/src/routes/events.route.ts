import { Router } from "express";
import * as eventsController from '../controllers/events.controller';

const router= Router();

router.post('/', eventsController.createEvent);
router.get('/find/:slug', eventsController.findEvent);
router.get('/user/:ownerId', eventsController.getUserEvents);
router.delete('/', eventsController.deleteEvent);
router.post('/tab', eventsController.addEventTab);
router.delete('/tab', eventsController.deleteEventTab);
router.get('/:event/:tab', eventsController.getTabBySlugs);

export default router;