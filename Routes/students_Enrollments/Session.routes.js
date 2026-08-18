
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

/* CREATE SINGLE */
router.post("/", createSession);

/* GENERATE SPRING + FALL */
router.post(
  "/generate",
  generateSessionsForDegreeClass
);

/* GET ALL */
router.get("/", getSessions);

/* CURRENT */
router.get(
  "/current",
  getCurrentSession
);

/* STATUS */
router.get(
  "/status",
  getSessionStatus
);

/* SINGLE */
router.get(
  "/:id",
  getSessionById
);

/* UPDATE */
router.put(
  "/:id",
  updateSession
);

/* DELETE */
router.delete(
  "/:id",
  deleteSession
);

export default router;