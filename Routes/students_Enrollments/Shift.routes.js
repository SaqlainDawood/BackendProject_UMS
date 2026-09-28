import express from "express";
import {
  createShift,
  getShifts,
  getShiftById,
  updateShift,
  deleteShift,
} from "../../Controllers/Student/student_Enrollments/Shift.controller.js";
import { authMiddleware } from "../../Middleware/authMiddleware.js";
import { checkPermission } from "../../Middleware/checkPermission.js";

const router = express.Router();

router.get("/", getShifts);
router.get("/:id", getShiftById);


router.post("/", authMiddleware, checkPermission("shift:add"), createShift);
router.put("/:id", authMiddleware, checkPermission("shift:update"), updateShift);
router.delete("/:id", authMiddleware, checkPermission("shift:delete"), deleteShift);

export default router;