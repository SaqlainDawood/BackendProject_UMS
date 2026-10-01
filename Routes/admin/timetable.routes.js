import express from "express";
import {
  getBatchTimetableSummary,
  createTimetableEntry,
  updateTimetableEntry,
  deleteTimetableEntry,
  getTeacherWorkload,
} from "../../Controllers/Admin/timetable.controller.js";
import { authMiddleware } from "../../Middleware/authMiddleware.js";
import { checkPermission } from "../../Middleware/checkPermission.js";

const router = express.Router();

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
