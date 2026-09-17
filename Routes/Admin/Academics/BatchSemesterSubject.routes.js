import express from "express";

import {
  createBatchSemesterSubject,
  getBatchSemesterSubjects,
  getSubjectsByBatchSemester,
  getBatchSemesterSubjectById,
  updateBatchSemesterSubject,
  deleteBatchSemesterSubject,
  getTeacherAssignedSubjects,
} from "../../../Controllers/Admin/Academics/BatchSemesterSubject.controller.js";

const router = express.Router();


router.post(
  "/",
  createBatchSemesterSubject
);

router.get(
  "/",
  getBatchSemesterSubjects
);


/*
  TEACHER ASSIGNED SUBJECTS
  GET /api/batch-semester-subjects/teacher/:teacherId
*/
router.get(
  "/teacher/:teacherId",
  getTeacherAssignedSubjects
);


/*
  BATCH + SEMESTER SUBJECTS
  GET /api/batch-semester-subjects/batch/:batchId/semester/:semester
*/
router.get(
  "/batch/:batchId/semester/:semester",
  getSubjectsByBatchSemester
);


/*
  SINGLE
  GET /api/batch-semester-subjects/:id
*/
router.get(
  "/:id",
  getBatchSemesterSubjectById
);


/*
  UPDATE TEACHER / STATUS
  PUT /api/batch-semester-subjects/:id
*/
router.put(
  "/:id",
  updateBatchSemesterSubject
);


/*
  DELETE
  DELETE /api/batch-semester-subjects/:id
*/
router.delete(
  "/:id",
  deleteBatchSemesterSubject
);

export default router;