import express from 'express'
import { protectFaculty } from '../../Middleware/facultyAuth.js';
import { fetchFacultyProfile } from '../../Controllers/Teacher/facultyPortalControllers.js';
import { FacultyLogin } from '../../Controllers/Teacher/facultyLoginReg.js';

const router = express.Router();
router.post('/login',FacultyLogin);
router.get('/me' , protectFaculty , fetchFacultyProfile);

export default router;