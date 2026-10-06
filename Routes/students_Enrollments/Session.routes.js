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
import { authMiddleware } from "../../Middleware/authMiddleware.js";
import { checkPermission } from "../../Middleware/checkPermission.js";

const router = express.Router();

router.use(authMiddleware);

router.post("/generate", checkPermission("session:add"), generateSessionsForDegreeClass);
router.get("/", getSessions);
router.get("/current", checkPermission("session:view"), getCurrentSession);
router.get("/status", checkPermission("session:view"), getSessionStatus);
router.delete("/bulk/:degreeClassId", checkPermission("session:delete"), deleteSessionsByDegreeClass);
router.get("/:id", getSessionById);
router.put("/:id", checkPermission("session:update"), updateSession);

export default router;