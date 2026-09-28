import express from "express";
import {
  createEnrollment,
  bulkCreateEnrollment,
  getEnrollments,
  getEnrollmentById,
  updateEnrollment,
  deleteEnrollment,
} from "../../Controllers/Student/student_Enrollments/Enrollment.controller.js";
import { authMiddleware } from "../../Middleware/authMiddleware.js";
import { checkPermission } from "../../Middleware/checkPermission.js";

const router = express.Router();

router.use(authMiddleware);

router.post("/", checkPermission("enrollment:add"), createEnrollment);
router.post("/bulk", checkPermission("enrollment:add"), bulkCreateEnrollment);
router.get("/", checkPermission("enrollment:view"), getEnrollments); // ?studentId=&batchId=&status=
router.get("/:id", checkPermission("enrollment:view"), getEnrollmentById);
router.put("/:id", checkPermission("enrollment:update"), updateEnrollment);
router.delete("/:id", checkPermission("enrollment:delete"), deleteEnrollment);

export default router;