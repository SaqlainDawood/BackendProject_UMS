import express from "express";

import {
  createSubject,
  getAllSubjects,
  getSubjectById,
  updateSubject,
  deleteSubject,
  toggleSubjectStatus,
} from "../../Controllers/Subject/Subject.controller.js";

const router = express.Router();


// Create Subject
router.post("/", createSubject);

// Get All Subjects
router.get("/", getAllSubjects);

// Get Subject By ID
router.get("/:id", getSubjectById);

// Update Subject
router.put("/:id", updateSubject);

// Delete Subject
router.delete("/:id", deleteSubject);

// Activate / Deactivate Subject
router.patch("/:id/toggle-status", toggleSubjectStatus);


export default router;