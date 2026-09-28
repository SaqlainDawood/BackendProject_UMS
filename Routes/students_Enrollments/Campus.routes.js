import express from "express";
import {
  createCampus,
  getCampuses,
  getCampusById,
  updateCampus,
  deleteCampus,
} from "../../Controllers/Student/student_Enrollments/Campus.controller.js";
import { authMiddleware } from "../../Middleware/authMiddleware.js";
import { checkPermission } from "../../Middleware/checkPermission.js";

const router = express.Router();

router.get("/", getCampuses);
router.get("/:id", getCampusById);

router.post("/", authMiddleware, checkPermission("campus:add"), createCampus);
router.put("/:id", authMiddleware, checkPermission("campus:update"), updateCampus);
router.delete("/:id", authMiddleware, checkPermission("campus:delete"), deleteCampus);

export default router;