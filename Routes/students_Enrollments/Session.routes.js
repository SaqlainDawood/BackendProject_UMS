import express from "express";
import {
  generateSessionsForDegreeClass,
  getSessions,
  getCurrentSession,
  getSessionStatus,
  getSessionById,
  updateSession,
  deleteSessionsByDegreeClass,
} from "../../Controllers/Student/student_Enrollments/Session.controller.js";
const router = express.Router();
router.post(
  "/generate",
  generateSessionsForDegreeClass
);
router.get(
  "/",
  getSessions
);
router.get(
  "/current",
  getCurrentSession
);

router.get(
  "/status",
  getSessionStatus
);
router.delete(
  "/bulk/:degreeClassId",
  deleteSessionsByDegreeClass
);
router.get(
  "/:id",
  getSessionById
);
router.put(
  "/:id",
  updateSession
);

export default router;