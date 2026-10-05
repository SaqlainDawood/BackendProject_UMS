import express from "express";
import {
  getBatchTimetableSummary,
  createTimetableEntry,
  updateTimetableEntry,
  deleteTimetableEntry,
  getTeacherWorkload,
  getAvailability,
  assignTeacher,
  generateTimetable,
} from "../../Controllers/Admin/timetable.controller.js";
import { authMiddleware } from "../../Middleware/authMiddleware.js";
import { checkPermission } from "../../Middleware/checkPermission.js";

const router = express.Router();

// ---- View ----
router.get(
  "/timetable/batches/:batchId/summary",
  authMiddleware,
  checkPermission("timetable:view"),
  getBatchTimetableSummary
);

router.get(
  "/timetable/teachers/:teacherId/workload",
  authMiddleware,
  checkPermission("timetable:view"),
  getTeacherWorkload
);

// Must stay above "/timetable/:id" routes
router.get(
  "/timetable/availability",
  authMiddleware,
  checkPermission("timetable:view"),
  getAvailability
);

// ---- Teacher assignment ----
router.post(
  "/timetable/assign-teacher",
  authMiddleware,
  checkPermission("timetable:create"),
  assignTeacher
);

// ---- Auto generation (body: { dryRun?, allowPartial?, batchIds? }) ----
router.post(
  "/timetable/batches/:batchId/generate",
  authMiddleware,
  checkPermission("timetable:create"),
  generateTimetable
);

router.post(
  "/timetable/generate",
  authMiddleware,
  checkPermission("timetable:create"),
  generateTimetable
);

// ---- Timetable entries ----
router.post(
  "/timetable",
  authMiddleware,
  checkPermission("timetable:create"),
  createTimetableEntry
);

router.put(
  "/timetable/:id",
  authMiddleware,
  checkPermission("timetable:update"),
  updateTimetableEntry
);

router.delete(
  "/timetable/:id",
  authMiddleware,
  checkPermission("timetable:delete"),
  deleteTimetableEntry
);

export default router;