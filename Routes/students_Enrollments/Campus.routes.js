import express from "express";
import {
  createCampus,
  getCampuses,
  getCampusById,
  updateCampus,
  deleteCampus,
} from "../../Controllers/Student/student_Enrollments/Campus.controller.js";

const router = express.Router();

router.post("/", createCampus);
router.get("/", getCampuses);
router.get("/:id", getCampusById);
router.put("/:id", updateCampus);
router.delete("/:id", deleteCampus);

export default router;