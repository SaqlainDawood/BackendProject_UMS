import express from "express";
import { getAllUsers } from "../../Controllers/Admin/userController.js";
import { authMiddleware } from "../../Middleware/authMiddleware.js";
import { checkPermission } from "../../Middleware/checkPermission.js";

constrouter = express.Router();

router.get(
  "/",
  authMiddleware,
  checkPermission("role:view", "teacher:view"),
  getAllUsers
);

export default router;
