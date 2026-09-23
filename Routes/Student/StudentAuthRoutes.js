// Routes/Student/StudentAuthRoutes.js
import express from "express";
import {
  studentSignup,
  studentVerifyEmail,
  studentLogin,
  studentGetMe,
  studentResendVerification,
  studentForgotPassword,
  studentResetPassword,
} from "../../Controllers/Student/StudentAuthController.js";
import { protectStudent } from "../../Middleware/studentAuth.js";

const router = express.Router();

/* ============================================================
   PUBLIC ROUTES
   ============================================================ */
router.post("/signup", studentSignup);
router.post("/verify-email/:token", studentVerifyEmail);
router.post("/login", studentLogin);
router.post("/resend-verification", studentResendVerification);
router.post("/forgot-password", studentForgotPassword);
router.post("/reset-password/:token", studentResetPassword);

/* ============================================================
   PROTECTED
   ============================================================ */
router.get("/me", protectStudent, studentGetMe);

export default router;