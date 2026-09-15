import express from "express";

import {
  createSession,
  generateSessionsForDegreeClass,
  getSessions,
  getCurrentSession,
  getSessionStatus,
  getSessionById,
  updateSession,
  deleteSession,
} from "../../Controllers/Student/student_Enrollments/Session.controller.js";

const router = express.Router();

// Create single session
router.post("/", createSession);

// Generate sessions according to DegreeClass duration
router.post(
  "/generate",
  generateSessionsForDegreeClass
);

// Get all sessions
router.get("/", getSessions);

// Current active session
router.get(
  "/current",
  getCurrentSession
);

// Session status
router.get(
  "/status",
  getSessionStatus
);

// Get single session
router.get(
  "/:id",
  getSessionById
);

// Update
router.put(
  "/:id",
  updateSession
);

// Delete
router.delete(
  "/:id",
  deleteSession
);

export default router;