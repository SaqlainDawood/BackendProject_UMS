import express from 'express';
import {
  getMarkingList,
  gradeSubmission,
  bulkGradeSubmissions,
  autoGradeQuiz,
  exportGrades
} from '../../Controllers/Teacher/gradingController.js';
import { protectFaculty } from '../../Middleware/facultyAuth.js';

const router = express.Router();

// All routes require faculty authentication
router.use(protectFaculty);
router.get('/activity/:activityId', getMarkingList);
router.put('/activity/:activityId/submission/:submissionId', gradeSubmission);
router.put('/activity/:activityId/bulk-grade', bulkGradeSubmissions);
router.post('/activity/:activityId/auto-grade', autoGradeQuiz);
router.get('/activity/:activityId/export', exportGrades);
export default router;