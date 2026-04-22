import { Router } from "express";
import * as userController from '../controllers/users.controller'

const router= Router();

router.post('/login', userController.login);
router.post('/glogin', userController.glogin);
router.post('/signup', userController.signup);

export default router;