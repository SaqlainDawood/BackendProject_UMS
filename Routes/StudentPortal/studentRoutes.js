import express from "express";
import {
  getStudentAttendanceSummary,
  getStudentCourseAttendance,
  exportStudentAttendance,
} from "../../Controllers/Student/studentAttendanceController.js";
import { protect } from "../../Middleware/authMiddleware.js";

const router = express.Router();
// Student Portal Attendance 
// All routes use protectStudent middleware which sets req.student
router.get('/summary', protect, getStudentAttendanceSummary);
router.get('/course/:classId', protect, getStudentCourseAttendance);
router.get('/export', protect, exportStudentAttendance);

export default router;