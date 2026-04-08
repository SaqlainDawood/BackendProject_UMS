import express from "express";
import {
  enrollSingleStudent,
  enrollBulkStudents,
  removeStudentFromClass,
  getClassStudents,
  getAvailableStudents,
  getStudentSchedule,
  updateStudentStatus,
  getEnrollmentStats
} from "../../Controllers/Admin/AdminClassCRUD/studentEnrollmentController.js";

const router = express.Router();

// Enrollment routes
router.post("/:classId/enroll/single", enrollSingleStudent);
router.post("/:classId/enroll/bulk", enrollBulkStudents);
router.delete("/:classId/students/:studentId", removeStudentFromClass);
router.patch("/:classId/students/:studentId/status", updateStudentStatus);

// Get routes
router.get("/:classId/students", getClassStudents);
router.get("/:classId/available-students", getAvailableStudents);
router.get("/:classId/enrollment-stats", getEnrollmentStats);

// Student schedule route
router.get("/students/:studentId/schedule", getStudentSchedule);

export default router;