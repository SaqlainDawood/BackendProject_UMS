import express from "express";
import {
  getStudentAttendanceSummary,
  getStudentCourseAttendance,
  exportStudentAttendance,
} from "../../Controllers/Student/studentAttendanceController.js";
import { protect } from "../../Middleware/authMiddleware.js";
const router = express.Router();

// Student Portal Attendance Routes
// All routes use protect middleware which sets req.student
router.get('/summary', protect, getStudentAttendanceSummary);
router.get('/course/:classId', protect, getStudentCourseAttendance);
router.get('/export', protect, exportStudentAttendance);

console.log('✅ Student Attendance Routes Loaded');
console.log('   - GET /summary');
console.log('   - GET /course/:classId');
console.log('   - GET /export');
export default router;