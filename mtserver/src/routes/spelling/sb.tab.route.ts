import { Router } from "express";
import * as sbController from '../../controllers/spelling/sb.tab.controller';

const router= Router();
//tab
router.get('/tab/:tabId', sbController.getFullTab);
//institution
router.post('/institution',sbController.addInstitution);
router.put('/institution',sbController.updateInstitution);
router.delete('/institution',sbController.deleteInstitution);
//tabMaster
router.post('/tabMaster',sbController.addTabMaster);
router.put('/tabMaster',sbController.updateTabMaster);
router.delete('/tabMaster',sbController.deleteTabMaster);
//speller
router.post('/speller',sbController.addSpeller);
router.put('/speller',sbController.updateSpeller);
router.delete('/speller',sbController.deleteSpeller);
//judge
router.post('/judge',sbController.addJudge);
router.put('/judge',sbController.updateJudge);
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
//draw


export default router;
