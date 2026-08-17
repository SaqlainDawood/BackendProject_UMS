import express from "express";
import {
  createFineType,
  getFineTypes,
  getFineTypeById,
  updateFineType,
  deleteFineType,
} from "../../Controllers/Student/student_Enrollments/FineType.controller.js";

const router = express.Router();

router.post("/", createFineType);
router.get("/", getFineTypes);
router.get("/:id", getFineTypeById);
router.put("/:id", updateFineType);
router.delete("/:id", deleteFineType);

export default router;