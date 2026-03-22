import express from 'express'
import { protectFaculty } from '../../Middleware/facultyAuth.js';
import { fetchFacultyProfile, getFacultyDashboard } from '../../Controllers/Teacher/facultyPortalControllers.js';
import { FacultyLogin } from '../../Controllers/Teacher/facultyLoginReg.js';

const router = express.Router();
router.post('/login',FacultyLogin);
router.get('/me' , protectFaculty , fetchFacultyProfile);
router.get('/dashboard/:facultyId' ,getFacultyDashboard );
export default router;