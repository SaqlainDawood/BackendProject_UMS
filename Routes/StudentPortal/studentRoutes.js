import express from "express";

import {
  getStudentAttendanceSummary,
  getStudentCourseAttendance,
  exportStudentAttendance,
} from "../../Controllers/Student/studentAttendanceController.js";
import { protect } from "../../Middleware/authMiddleware.js";
const router = express.Router();
router.get('/attendance/summary/:studentId', protect, getStudentAttendanceSummary);
router.get('/attendance/course/:studentId/:classId', protect, getStudentCourseAttendance);
router.get('/attendance/export/:studentId', protect, exportStudentAttendance);

export default router;
