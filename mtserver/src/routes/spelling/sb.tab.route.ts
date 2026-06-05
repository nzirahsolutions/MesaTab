import { Router } from "express";
import * as sbController from '../../controllers/spelling/sb.tab.controller';

const router= Router();
//tab
router.get('/tab/:tabId', sbController.getFullTab);
router.put('/tab/update',sbController.updateTab);
//institution
router.put('/institution',sbController.updateInstitutions);
router.delete('/institution',sbController.deleteInstitution);
//tabMaster
router.post('/tabMaster',sbController.addTabMaster);
router.put('/tabMaster',sbController.updateTabMaster);
router.delete('/tabMaster',sbController.deleteTabMaster);
//speller
router.put('/speller',sbController.updateSpellers);
router.delete('/speller',sbController.deleteSpeller);
//judge
router.put('/judge',sbController.updateJudges);
router.delete('/judge',sbController.deleteJudge);
//room
router.post('/room',sbController.addRoom);
router.put('/room',sbController.updateRoom);
router.delete('/room',sbController.deleteRoom);
//round
router.post('/round',sbController.addRound);
router.put('/round',sbController.updateRound);
router.delete('/round',sbController.deleteRound);
//word
router.post('/word',sbController.addWord);
router.put('/word',sbController.updateWord);
router.delete('/word',sbController.deleteWord);

export default router;
