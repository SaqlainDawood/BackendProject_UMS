import express from 'express'
import { adminRegister , adminLogin , getAdminProfile , updateAdminProfile } from '../Controllers/Admin/AdminController.js'
import {protectAdmin} from '../Middleware/adminAuth.js'
const router = express.Router();


router.post('/register' , adminRegister);
router.post('/login' , adminLogin);
router.get("/me", protectAdmin, getAdminProfile);
router.put('/me' , protectAdmin , updateAdminProfile);

export default router;

