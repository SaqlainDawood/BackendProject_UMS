import express from 'express';
import { authMiddleware } from '../Middleware/authMiddleware.js';
import { checkPermission } from '../Middleware/checkPermission.js';
import {
  getAcademicNumberStudents,
  getAcademicNumberStudentById,
  getClassStudentCount,
  previewBulkAssignment,
  assignBulk,
  assignSingle,
  updateAcademicNumbers,
  clearAcademicNumbers,
  getAssignmentHistory,
  exportAcademicNumbers,
} from '../Controllers/studentAcademicNumber.controller.js';

const router = express.Router();

router.use(authMiddleware);

router.get('/students/academic-numbers', checkPermission('studentacademicnumber:view'), getAcademicNumberStudents);
router.get('/students/academic-numbers/export', checkPermission('studentacademicnumber:export'), exportAcademicNumbers);
router.get('/students/academic-numbers/:studentId', checkPermission('studentacademicnumber:view'), getAcademicNumberStudentById);
router.post('/students/academic-numbers/preview', checkPermission('studentacademicnumber:assign'), previewBulkAssignment);
router.post('/students/academic-numbers/assign-bulk', checkPermission('studentacademicnumber:assign'), assignBulk);
router.post('/students/:studentId/academic-numbers/assign', checkPermission('studentacademicnumber:assign'), assignSingle);
router.patch('/students/:studentId/academic-numbers', checkPermission('studentacademicnumber:update'), updateAcademicNumbers);
router.delete('/students/:studentId/academic-numbers', checkPermission('studentacademicnumber:clear'), clearAcademicNumbers);
router.get('/students/:studentId/academic-numbers/history', checkPermission('studentacademicnumber:view'), getAssignmentHistory);
router.get('/classes/:classId/student-count', checkPermission('studentacademicnumber:view'), getClassStudentCount);

export default router;
