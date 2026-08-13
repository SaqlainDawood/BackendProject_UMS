import express from "express";
import {
  createBatch,
  getBatches,
  getBatchById,
  getBatchSemesters,
  advanceBatch,
  updateBatch,
  deleteBatch,
} from "../../Controllers/Student/student_Enrollments/Batch.controller.js";

const router = express.Router();

router.post("/", createBatch);
router.get("/", getBatches);                        // ?departmentId=&degreeClassId=&shiftId=&status=
router.get("/:id", getBatchById);
router.get("/:id/semesters", getBatchSemesters);      // completed / current / pending breakdown
router.put("/:id/advance", advanceBatch);             // { sessionId }
router.put("/:id", updateBatch);
router.delete("/:id", deleteBatch);

export default router;