import express from "express";
import {
  getStudentAttendanceSummary,
  getStudentCourseAttendance,
  exportStudentAttendance,
} from "../../Controllers/Student/studentAttendanceController.js";
import { protectStudent } from "../../Middleware/authMiddleware.js";

const router = express.Router();

// All routes use protectStudent middleware which sets req.student
router.get('/summary', protectStudent, getStudentAttendanceSummary);
router.get('/course/:classId', protectStudent, getStudentCourseAttendance);
router.get('/export', protectStudent, exportStudentAttendance);

export default router;