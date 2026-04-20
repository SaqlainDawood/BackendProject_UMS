import express from 'express';
import {
  getStudentActivities,
  getActivityDetails,
  submitAssignment,
  submitQuiz,
  getStudentGrades,
  getUpcomingDeadlines
} from '../../Controllers/Student/studentActivityController.js';
import { protect } from '../../Middleware/authMiddleware.js';
import { upload } from '../../Middleware/Multer.js';

const router = express.Router();

// All routes require student authentication
router.use(protect);

// Activities
router.get('/activities', getStudentActivities);
router.get('/activities/:activityId', getActivityDetails);
router.post('/activities/:activityId/submit', upload.single('file'), submitAssignment);
router.post('/activities/:activityId/quiz-submit', submitQuiz);

// Grades
router.get('/grades', getStudentGrades);

// Deadlines
router.get('/upcoming', getUpcomingDeadlines);

export default router;