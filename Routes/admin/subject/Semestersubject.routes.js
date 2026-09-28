import express from "express";
import {
  addSubjectToSemester,
  getSubjectsBySemester,
  updateSemesterSubject,
  removeSemesterSubject,
} from "../../../Controllers/Admin/subject/Semestersubject.controller.js";
import { authMiddleware } from "../../../Middleware/authMiddleware.js";
import { checkPermission } from "../../../Middleware/checkPermission.js";

const router = express.Router();

router.get("/semester/:programSemesterId", getSubjectsBySemester);
router.post(
  "/",
  authMiddleware,
  checkPermission("semestersubject:create"),
  addSubjectToSemester
);
router.put(
  "/:id",
  authMiddleware,
  checkPermission("semestersubject:update"),
  updateSemesterSubject
);
router.patch(
  "/:id/remove",
  authMiddleware,
  checkPermission("semestersubject:delete"),
  removeSemesterSubject
);

export default router;