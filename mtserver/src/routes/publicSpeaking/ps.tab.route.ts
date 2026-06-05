import { Router } from 'express';
import * as psController from '../../controllers/publicSpeaking/ps.tab.controller';

const router = Router();

router.get('/tab/:tabId', psController.getFullTab);
router.put('/tab/update', psController.updateTab);

router.put('/institution', psController.updateInstitutions);
router.delete('/institution', psController.deleteInstitution);

router.post('/tabMaster', psController.addTabMaster);
router.put('/tabMaster', psController.updateTabMaster);
router.delete('/tabMaster', psController.deleteTabMaster);

router.put('/speaker', psController.updateSpeakers);
router.delete('/speaker', psController.deleteSpeaker);

router.put('/judge', psController.updateJudges);
router.delete('/judge', psController.deleteJudge);

router.post('/room', psController.addRoom);
router.put('/room', psController.updateRoom);
router.delete('/room', psController.deleteRoom);

router.post('/round', psController.addRound);
router.put('/round', psController.updateRound);
router.delete('/round', psController.deleteRound);

router.post('/prompt', psController.addPrompt);
router.put('/prompt', psController.updatePrompt);
router.delete('/prompt', psController.deletePrompt);

export default router;
