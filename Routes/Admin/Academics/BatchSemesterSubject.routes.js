import express from "express";

import {
  createBatchSemesterSubject,
  getBatchSemesterSubjects,
  getBatchSemesterSubjectById,
  updateBatchSemesterSubject,
  deleteBatchSemesterSubject,
  toggleBatchSemesterSubjectStatus,
} from "../../../Controllers/Admin/Academics/Subject_assign.controller.js";

const router = express.Router();

router.post(
  "/",
  createBatchSemesterSubject
);

// GET ALL
// GET /api/batch-semester-subjects
router.get(
  "/",
  getBatchSemesterSubjects
);


router.get(
  "/:id",
  getBatchSemesterSubjectById
);

// UPDATE
// PUT /api/batch-semester-subjects/:id
router.put(
  "/:id",
  updateBatchSemesterSubject
);

// DELETE
// DELETE /api/batch-semester-subjects/:id
router.delete(
  "/:id",
  deleteBatchSemesterSubject
);
// TOGGLE STATUS
// PATCH /api/batch-semester-subjects/:id/toggle-status
router.patch(
  "/:id/toggle-status",
  toggleBatchSemesterSubjectStatus
);

export default router;