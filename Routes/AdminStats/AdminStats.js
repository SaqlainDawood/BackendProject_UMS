import express from 'express'
import { getTotalStudents , getStudentsStats, getPendingStudents, approveStudents, rejectStudent, getUnassignRollStd, assignRollNoStd } from '../../Controllers/Admin/AdminStatController.js';
import { protectAdmin } from '../../Middleware/adminAuth.js';
import { getAllStudentList } from '../../Controllers/Admin/AllStdListController.js';
const router = express.Router();

router.get('/total-students' ,protectAdmin, getTotalStudents);
router.get('/all/students' , protectAdmin , getStudentsStats);
router.get('/students/pending' ,getPendingStudents);
router.put('/students/approve/:id' , approveStudents);
router.put('/students/rejected/:id' , rejectStudent);
router.get('/students/unassign' ,protectAdmin , getUnassignRollStd);
router.put('/students/assign',protectAdmin,assignRollNoStd);
router.get('/students/all' , protectAdmin, getAllStudentList);
export default router;
