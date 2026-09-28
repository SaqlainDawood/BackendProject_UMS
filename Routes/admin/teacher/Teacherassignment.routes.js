import express from "express";
import {
  assignTeacher,
  getAssignmentsByBatch,
  getAssignmentsByTeacher,
  reassignTeacher,
  deactivateAssignment,
} from "../../../Controllers/Admin/teacher/Teacherassignment.controller.js";
import { authMiddleware } from "../Middleware/authMiddleware.js";
import { checkPermission } from "../Middleware/checkPermission.js";

const router = express.Router();

router.get(
  "/batch/:batchId",
  authMiddleware,
  checkPermission("teacherassignment:view"),
  getAssignmentsByBatch
);
router.get(
  "/teacher/:teacherId",
  authMiddleware,
  checkPermission("teacherassignment:view"),
  getAssignmentsByTeacher
);
router.post(
  "/",
  authMiddleware,
  checkPermission("teacherassignment:create"),
  assignTeacher
);
router.put(
  "/:id/reassign",
  authMiddleware,
  checkPermission("teacherassignment:update"),
  reassignTeacher
);
router.patch(
  "/:id/deactivate",
  authMiddleware,
  checkPermission("teacherassignment:delete"),
  deactivateAssignment
);

export default router;