import express from "express";

import {
  getClassAttendance,
  getDepartmentAttendance,
  getStudentAttendance,
  Overview,
} from "../../Controllers/Admin/Attendance/Attendance.js";
// Admin Side attendance Routes
const router = express.Router();
router.get('/overview', Overview);
router.get('/department/:departmentName', getDepartmentAttendance);
router.get('/class/:classId', getClassAttendance);
router.get('/student/:studentId', getStudentAttendance);

export default router;

