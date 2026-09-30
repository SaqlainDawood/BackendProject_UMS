import express from "express";
import {
  createTeacher,
  getAllTeachers,
  getTeacherById,
  updateTeacher,
  deactivateTeacher,
} from "../../../Controllers/Admin/teacher/Teacher.controller.js";
import { authMiddleware } from "../../../Middleware/authMiddleware.js";
import { checkPermission } from "../../../Middleware/checkPermission.js";

const router = express.Router();

router.get("/", authMiddleware, checkPermission("teacher:view"), getAllTeachers);
router.get("/:id", authMiddleware, checkPermission("teacher:view"), getTeacherById);
router.post("/", authMiddleware, checkPermission("teacher:add"), createTeacher);
router.put("/:id", authMiddleware, checkPermission("teacher:update"), updateTeacher);
router.patch(
  "/:id/deactivate",
  authMiddleware,
  checkPermission("teacher:delete"),
  deactivateTeacher
);

export default router;