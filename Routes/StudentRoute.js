import express from "express";
import { upload, uploadMarksheet } from "../Middleware/Multer.js";

import {
  saveStudentStep,
  getStudentDraft,
  cleanupExpiredDrafts,
  getStudent,
  getAllStudents,
  studentLogin,
  StudentCredentials,
  studentProfile,
} from "../Controllers/Student/StudentController.js";

import { protect } from "../Middleware/authMiddleware.js";

const router = express.Router();

router.post(
  "/step/:step",
  (req, res, next) => {
    const step = Number(req.params.step);

    // STEP 1 — Profile Image
    if (step === 1) {
      return upload.single("profileImage")(req, res, next);
    }

    // STEP 3 — Educational Documents
    if (step === 3) {
      return uploadMarksheet.any()(req, res, next);
    }

    // STEP 2 & STEP 4 — No files
    if (step === 2 || step === 4) {
      return next();
    }

    return res.status(400).json({
      success: false,
      message: "Invalid registration step. Allowed steps are 1, 2, 3, and 4.",
    });
  },
  saveStudentStep
);

router.get("/draft/:studentId", getStudentDraft);

router.post("/cleanup-drafts", cleanupExpiredDrafts);

router.post(
  "/step1",
  upload.single("profileImage"),
  (req, res, next) => {
    req.params.step = "1";
    next();
  },
  saveStudentStep
);

router.post(
  "/step2/:id",
  (req, res, next) => {
    req.params.step = "2";
    req.body.studentId = req.params.id;
    next();
  },
  saveStudentStep
);

router.post(
  "/step3/:studentId",
  (req, res, next) => {
    uploadMarksheet.any()(req, res, (err) => {
      if (err) {
        console.error("STEP 3 MULTER/CLOUDINARY ERROR:", err);

        return res.status(400).json({
          success: false,
          message: err.message || "File upload failed",
          error: err,
        });
      }

      next();
    });
  },
  
  (req, res, next) => {
    req.params.step = "3";
    req.body.studentId = req.params.studentId;
    next();
  },
  saveStudentStep
);

router.post(
  "/step4/:id",
  (req, res, next) => {
    req.params.step = "4";
    req.body.studentId = req.params.id;
    next();
  },
  saveStudentStep
);

router.post("/set-credentials", StudentCredentials);

router.post("/login", studentLogin);

router.get("/me", protect, studentProfile);

router.get("/", getAllStudents);
router.get("/:id", protect, getStudent);
export default router;