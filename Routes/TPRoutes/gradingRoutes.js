import express from "express";
import {
  getMarkingList,
  gradeSubmission,
  bulkGradeSubmissions,
  autoGradeQuiz,
  exportGrades,
} from "../../Controllers/Teacher/gradingController.js";
import { authMiddleware } from "../../Middleware/authMiddleware.js";
import { checkPermission } from "../../Middleware/checkPermission.js";

const router = express.Router();
// GET marking list for an activity
router.get(
  "/activity/:activityId",
  authMiddleware,
  checkPermission("marks:view"),
  getMarkingList
);

// Grade a single submission
router.put(
  "/activity/:activityId/submission/:submissionId",
  authMiddleware,
  checkPermission("marks:update"),
  gradeSubmission
);

// Bulk grade submissions
router.put(
  "/activity/:activityId/bulk-grade",
  authMiddleware,
  checkPermission("marks:update"),
  bulkGradeSubmissions
);

// Auto-grade quiz
router.post(
  "/activity/:activityId/auto-grade",
  authMiddleware,
  checkPermission("marks:update"),
  autoGradeQuiz
);

// Export grades
router.get(
  "/activity/:activityId/export",
  authMiddleware,
  checkPermission("marks:view"),
  exportGrades
);

export default router;