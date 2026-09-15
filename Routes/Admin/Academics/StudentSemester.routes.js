import express from "express";

import {
  createStudentSemester,
  addOrUpdateSemesterSubject,
  removeSemesterSubject,
  updateStudentSemester,
  getStudentSemesters,
  getStudentSemesterById,
  deleteStudentSemester,
} from "../../../Controllers/Admin/Academics/StudentSemester.controller.js";

const router = express.Router();

// Create semester
router.post("/", createStudentSemester);

// View complete academic record of student
router.get(
  "/student/:studentId",
  getStudentSemesters
);

// View single semester
router.get(
  "/:id",
  getStudentSemesterById
);



// Add / update subject
router.put(
  "/:id/subjects",
  addOrUpdateSemesterSubject
);

// Remove subject
router.delete(
  "/:id/subjects/:bssId",
  removeSemesterSubject
);

// Update GPA / status / remarks
router.put(
  "/:id",
  updateStudentSemester
);
router.delete(
  "/:id",
  deleteStudentSemester
);

export default router;