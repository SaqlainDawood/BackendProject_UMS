import express from "express";
import {
  createDegreeClass,
  getDegreeClasses,
  getDegreeClassById,
  updateDegreeClass,
  deleteDegreeClass,
} from "../../Controllers/Student/student_Enrollments/Degreeclass.controller.js";

const router = express.Router();

router.post("/", createDegreeClass);
router.get("/", getDegreeClasses);          
router.get("/:id", getDegreeClassById);
router.put("/:id", updateDegreeClass);
router.delete("/:id", deleteDegreeClass);

export default router;