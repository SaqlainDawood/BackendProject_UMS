import express from "express";
import {
  createSubject,
  getSubjects,
  getSubjectById,
  updateSubject,
  deleteSubject,
} from "../../../Controllers/Admin/Academics/Subject.controller.js";

const router = express.Router();

router.post("/", createSubject);
router.get("/", getSubjects); // ?departmentId=&degreeClassId=&semester=&shift=
router.get("/:id", getSubjectById);
router.put("/:id", updateSubject);
router.delete("/:id", deleteSubject);

export default router;