import express from "express";

import {
  getMyCurrentSemester,
  getMyAllSemesters,
  getMySubjects,
  getMyMarks,
  getMyAttendance,
  getMyActivities,
} from "../../Controllers/Student/StudentPortal.controller.js";

import { protect } from "../../Middleware/AuthMiddleware.js";

const router = express.Router();


// =====================================================
// STUDENT PORTAL
// =====================================================

router.get(
  "/current-semester",
  protect,
  getMyCurrentSemester
);

router.get(
  "/semesters",
  protect,
  getMyAllSemesters
);

router.get(
  "/subjects",
  protect,
  getMySubjects
);

router.get(
  "/marks",
  protect,
  getMyMarks
);

router.get(
  "/attendance",
  protect,
  getMyAttendance
);

router.get(
  "/activities",
  protect,
  getMyActivities
);

export default router;