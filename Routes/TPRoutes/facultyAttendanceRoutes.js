import express from "express";

import {
  getClassStudents,
  markAttendance,
  getClassAttendanceHistory,
  getStudentAttendance,
  editAttendance,
  getAttendanceReport,
} from "../../Controllers/Teacher/facultyAttendanceController.js";

const router = express.Router();

// Add these new routes to your existing faculty routes file

// ==================== ATTENDANCE ROUTES ====================

// Get students for a specific class (for marking attendance)
router.get("/class/:classId/students", getClassStudents);

// Mark attendance for a class
router.post("/attendance/mark", markAttendance);

// Get attendance history for a class
router.get("/attendance/class/:classId", getClassAttendanceHistory);

// Get attendance for a specific student
router.get("/attendance/student/:studentId/:classId", getStudentAttendance);

// Edit/update attendance
router.put("/attendance/edit/:attendanceId", editAttendance);

// Get attendance report for a class
router.get("/attendance/report/:classId", getAttendanceReport);

export default router