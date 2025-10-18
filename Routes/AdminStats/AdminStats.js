import express from 'express'
import { getTotalStudents , getStudentsStats, getPendingStudents, approveStudents, rejectStudent } from '../../Controllers/Admin/AdminStatController.js';
import { protectAdmin } from '../../Middleware/adminAuth.js';
const router = express.Router();

router.get('/total-students' ,protectAdmin, getTotalStudents);
router.get('/all/students' , protectAdmin , getStudentsStats);
router.get('/students/pending' ,getPendingStudents);
router.put('/students/approve/:id' , approveStudents);
router.put('/students/rejected/:id' , rejectStudent);
export default router;
