import express from "express";
import {
  login,
  register,
  getMe,
  logout,
  changePassword,
  forgotPassword,
  resetPassword,
} from "../../Controllers/auth/authController.js";
import { authMiddleware } from "../../Middleware/authMiddleware.js";
import { checkPermission } from "../../Middleware/checkPermission.js";

const router = express.Router();
router.post("/login", login);
router.post("/forgot-password", forgotPassword);
router.post("/reset-password/:token", resetPassword);
router.get("/me", authMiddleware, getMe);
router.post("/logout", authMiddleware, logout);
router.patch("/change-password", authMiddleware, changePassword);
router.post(
  "/register",
  authMiddleware,
  checkPermission("role:create"),
  register
);

export default router;