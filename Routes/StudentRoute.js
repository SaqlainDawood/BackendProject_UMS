import express from "express";
import { upload, uploadMarksheet } from "../Middleware/Multer.js";
import {
  saveStudentStep,
  getStudentDraft,
  cleanupExpiredDrafts,
  // step1Create,
  // step2Update,
  // step3Update,
  // step4Update,
  getStudent,
  getAllStudents,
  studentLogin,
  StudentCredentials,
  studentProfile
} from "../Controllers/Student/StudentController.js";
import { protect } from "../Middleware/authMiddleware.js";
const router = express.Router();

// Student Registration
// Step1: use upload.single('profileImage')
// router.post("/step1", upload.single("profileImage"), step1Create);

// // Step2:
// router.post("/step2/:id", step2Update);

// router.post(
//   "/step3/:studentId",
//   uploadMarksheet.any("marksheet"), // any() bhi chalega, but single fieldname pass karo to best
//   step3Update
// );

// // Step4:
// router.post("/step4/:id", step4Update);

// student credentials Register with password
router.post(
  "/step/:step",
  (req, res, next) => {
    const step = parseInt(req.params.step);
    
    if (step === 1) {
      return upload.single("profileImage")(req, res, next);
    } else if (step === 3) {
      return uploadMarksheet.any()(req, res, next);
    }
    next();
  },
  saveStudentStep
);

// Get draft for resuming registration
router.get("/draft/:studentId", getStudentDraft);

// Cleanup expired drafts (optional endpoint for admin)
router.post("/cleanup-drafts", cleanupExpiredDrafts);

// Keep existing routes for backward compatibility
router.post("/step1", upload.single("profileImage"), saveStudentStep);
router.post("/step2/:id", (req, res, next) => {
  req.params.step = "2";
  req.body.studentId = req.params.id;
  next();
}, saveStudentStep);
router.post("/step3/:studentId", uploadMarksheet.any(), (req, res, next) => {
  req.params.step = "3";
  req.body.studentId = req.params.studentId;
  next();
}, saveStudentStep);
router.post("/step4/:id", (req, res, next) => {
  req.params.step = "4";
  req.body.studentId = req.params.id;
  next();
}, saveStudentStep);

router.post("/set-credentials", StudentCredentials);
// Student Login Route

router.post("/login", studentLogin);

router.get("/me", protect, studentProfile);

// Get all students (list/filter) — MUST be before /:id
router.get("/", getAllStudents);

// Get student:
router.get("/:id", protect, getStudent);
export default router;