import express from "express";
import {
  createBatch,
  getBatches,
  getBatchById,
  getBatchSemesters,
  getNextSession,
  advanceBatch,
  updateBatch,
  deleteBatch,
  getHierarchy,
} from "../../Controllers/Student/student_Enrollments/Batch.controller.js";
import { authMiddleware } from "../../Middleware/authMiddleware.js";
import { checkPermission } from "../../Middleware/checkPermission.js";

const router = express.Router();

router.use(authMiddleware);

router.post("/", checkPermission("batch:add"), createBatch);

/* static paths /:id se PEHLE */
router.get("/",  getBatches);
router.get("/next-session", checkPermission("batch:view"), getNextSession);
router.get("/hierarchy", checkPermission("batch:view"), getHierarchy);

router.get("/:id",  getBatchById);
router.get("/:id/semesters", checkPermission("batch:view"), getBatchSemesters);
router.put("/:id/advance", checkPermission("batch:update"), advanceBatch);
router.put("/:id", checkPermission("batch:update"), updateBatch);
router.delete("/:id", checkPermission("batch:delete"), deleteBatch);

export default router;