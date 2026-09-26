// Routes/Staff/StaffAuthRoutes.js
import express from "express";
import {
  staffSignup,
  staffVerifyEmail,
  staffLogin,
  staffGetMe,
  staffResendVerification,
  staffForgotPassword,          
  staffResetPassword,           
  showStaffResetPasswordPage,   
} from "../../Controllers/Staff/StaffAuth.controller.js";
import { protectStaff } from "../../Middleware/staffAuth.js";

const router = express.Router();
router.post("/signup", staffSignup);
router.post("/verify-email/:token", staffVerifyEmail);
router.get("/verify-email/:token", staffVerifyEmail);
// Support frontend GET link: /api/staff/verify-email?token=...
router.get("/verify-email", staffVerifyEmail);
router.post("/login", staffLogin);
router.post("/resend-verification", staffResendVerification);
router.post("/forgot-password", staffForgotPassword);
router.get("/reset-password/:token", showStaffResetPasswordPage);
router.post("/reset-password/:token", staffResetPassword);
router.get("/me", protectStaff, staffGetMe);

export default router;