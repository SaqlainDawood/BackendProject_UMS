import express from "express";
import {
  createDegreeClass,
  getDegreeClasses,
  getDegreeClassById,
  updateDegreeClass,
  deleteDegreeClass,
} from "../../Controllers/Student/student_Enrollments/Degreeclass.controller.js";
import { authMiddleware } from "../../Middleware/authMiddleware.js";
import { checkPermission } from "../../Middleware/checkPermission.js";

const router = express.Router();

router.get("/", getDegreeClasses);
router.get("/:id", getDegreeClassById);


router.post("/", authMiddleware, checkPermission("class:add"), createDegreeClass);
router.put("/:id", authMiddleware, checkPermission("class:update"), updateDegreeClass);
router.delete("/:id", authMiddleware, checkPermission("class:delete"), deleteDegreeClass);

export default router;