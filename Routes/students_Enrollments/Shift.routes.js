import express from "express";
import {
  createShift,
  getShifts,
  getShiftById,
  updateShift,
  deleteShift,
} from "../../Controllers/Student/student_Enrollments/Shift.controller.js"; 

const router = express.Router();

router.post("/", createShift);
router.get("/", getShifts);          
router.get("/:id", getShiftById);
router.put("/:id", updateShift);
router.delete("/:id", deleteShift);

export default router;