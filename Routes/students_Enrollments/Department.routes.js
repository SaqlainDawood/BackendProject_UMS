import express from "express";
import {
  createDepartment,
  getDepartments,
  getDepartmentById,
  updateDepartment,
  deleteDepartment,
} from "../../Controllers/Student/student_Enrollments/Department.controller.js";
import { authMiddleware } from "../../Middleware/authMiddleware.js";
import { checkPermission } from "../../Middleware/checkPermission.js";

const router = express.Router();

router.get("/", getDepartments);
router.get("/:id", getDepartmentById);

router.post("/", authMiddleware, checkPermission("department:add"), createDepartment);
router.put("/:id", authMiddleware, checkPermission("department:update"), updateDepartment);
router.delete("/:id", authMiddleware, checkPermission("department:delete"), deleteDepartment);

export default router;