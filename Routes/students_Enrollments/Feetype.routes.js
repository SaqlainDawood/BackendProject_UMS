import express from "express";
import {
  createFeeType,
  getFeeTypes,
  getFeeTypeById,
  updateFeeType,
  deleteFeeType,
} from "../../Controllers/Student/student_Enrollments/Feetype.controller.js";

const router = express.Router();

router.post("/", createFeeType);
router.get("/", getFeeTypes);
router.get("/:id", getFeeTypeById);
router.put("/:id", updateFeeType);
router.delete("/:id", deleteFeeType);

export default router;