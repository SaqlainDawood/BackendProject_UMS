import express from "express";
import {
  createSubject,
  getAllSubjects,
  getSubjectById,
  updateSubject,
  deactivateSubject,
} from "../../../Controllers/Admin/subject/Subject.controller.js";
import { authMiddleware } from "../../../Middleware/authMiddleware.js";
import { checkPermission } from "../../../Middleware/checkPermission.js";

const router = express.Router();

router.get("/", getAllSubjects);
router.get("/:id", getSubjectById);
router.post("/", authMiddleware, checkPermission("subject:add"), createSubject);
router.put("/:id", authMiddleware, checkPermission("subject:update"), updateSubject);
router.patch(
  "/:id/deactivate",
  authMiddleware,
  checkPermission("subject:delete"),
  deactivateSubject
);

export default router;