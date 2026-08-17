import express from "express";
import {
  createTuitionFee,
  getTuitionFees,
  getTuitionFeeById,
  updateTuitionFee,
  deleteTuitionFee,
} from "../../Controllers/Student/student_Enrollments/Tuitionfee.controller.js";

const router = express.Router();

router.post("/", createTuitionFee);
router.get("/", getTuitionFees);          // ?departmentId=&degreeClassId=&shiftId=
router.get("/:id", getTuitionFeeById);
router.put("/:id", updateTuitionFee);
router.delete("/:id", deleteTuitionFee);

export default router;