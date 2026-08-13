import express from "express";
import {
  createSession,
  getSessions,
  getCurrentSession,
  getSessionById,
  updateSession,
  deleteSession,
} from "../../Controllers/Student/student_Enrollments/Session.controller.js";

const router = express.Router();

router.post("/", createSession);
router.get("/", getSessions);              // ?term=Fall&year=2026
router.get("/current", getCurrentSession);  // ⚠️ /:id se PEHLE
router.get("/:id", getSessionById);
router.put("/:id", updateSession);
router.delete("/:id", deleteSession);  

export default router;