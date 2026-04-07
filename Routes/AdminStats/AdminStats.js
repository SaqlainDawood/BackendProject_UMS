import express from "express";
import {
  getTotalStudents,
  getStudentsStats,
  getPendingStudents,
  approveStudents,
  rejectStudent,
  getUnassignRollStd,
  assignRollNoStd,
} from "../../Controllers/Admin/AdminStatController.js";
import { protectAdmin } from "../../Middleware/adminAuth.js";
import { getAllStudentList } from "../../Controllers/Admin/AllStdListController.js";
import { testBrevoConnection } from "../../utils/emailService.js";
const router = express.Router();

router.get("/total-students", protectAdmin, getTotalStudents);
router.get("/all/students", protectAdmin, getStudentsStats);
router.get("/students/pending", getPendingStudents);
router.put("/students/approve/:id", approveStudents);
router.put("/students/rejected/:id", rejectStudent);
router.get("/students/unassign", protectAdmin, getUnassignRollStd);
router.put("/students/assign", protectAdmin, assignRollNoStd);
router.get("/students/all", protectAdmin, getAllStudentList);
// Test Brevo API endpoint
router.get("/test-brevo", async (req, res) => {
  try {
    const testEmail = req.query.email || "saqlaindawood123@gmail.com"; // CHANGE THIS

    console.log("Testing Brevo API with email:", testEmail);

    const result = await testBrevoConnection(testEmail);

    res.json({
      success: result.success,
      message: result.success ? "Brevo API is working!" : "Brevo API failed",
      details: result,
    });
  } catch (error) {
    console.error("Test route error:", error);
    res.status(500).json({ error: error.message });
  }
});
export default router;
