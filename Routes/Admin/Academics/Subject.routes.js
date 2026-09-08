import express from "express";
import {
  createSubject,
  getAllSubjects,
  getSubjectById,
  updateSubject,
  deleteSubject,
} from "../../../Controllers/Subject/Subject.controller.js";

const router = express.Router();

router.post("/", createSubject);
router.get("/", getAllSubjects); // ?departmentId=&degreeClassId=&semester=&shift=
router.get("/:id", getSubjectById);
router.put("/:id", updateSubject);
router.delete("/:id", deleteSubject);

export default router;