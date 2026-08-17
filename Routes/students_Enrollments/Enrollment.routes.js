import express from "express";
import {
  createEnrollment,
  bulkCreateEnrollment,
  getEnrollments,
  getEnrollmentById,
  updateEnrollment,
  deleteEnrollment,
} from "../../Controllers/Student/student_Enrollments/Enrollment.controller.js";

const router = express.Router();

router.post("/", createEnrollment);
router.post("/bulk", bulkCreateEnrollment);   // ⚠️ /:id se PEHLE (yahan koi issue nahi, "bulk" alag path hai POST mein)
router.get("/", getEnrollments);          // ?studentId=&batchId=&status=
router.get("/:id", getEnrollmentById);
router.put("/:id", updateEnrollment);      // { status: "completed" / "dropped" }
router.delete("/:id", deleteEnrollment);

export default router;