import express from "express";
import {
  getClassCreditSummary,
  getSemesterCreditSummary,
  getStudentCreditSummary,
} from "../../Controllers/CMS/creditSummary.controller.js";
import { authMiddleware } from "../../Middleware/authMiddleware.js";
import { checkPermission } from "../../Middleware/checkPermission.js";

const router = express.Router();

router.get(
  "/classes/:classId/credit-summary",
  authMiddleware,
  checkPermission("class:view"),
  getClassCreditSummary
);

router.get(
  "/semesters/:semesterId/credit-summary",
  authMiddleware,
  checkPermission("programsemester:view"),
  getSemesterCreditSummary
);

router.get(
  "/students/:studentId/credit-summary",
  authMiddleware,
  checkPermission("student:view"),
  getStudentCreditSummary
);

export default router;
