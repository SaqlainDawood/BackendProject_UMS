// Routes/CMS/userRoleRoutes.js
import express from "express";
import {
  assignRoleToUser,
  getUserPermissions,
} from "../../Controllers/CMS/userRoleController.js";
import { authMiddleware } from "../../Middleware/authMiddleware.js";
import { checkPermission } from "../../Middleware/checkPermission.js";

const router = express.Router();

router.use(authMiddleware);

router.patch("/:userId/assign-role", checkPermission("role:update"), assignRoleToUser);
router.get("/:userId/permissions", checkPermission("permission:view"), getUserPermissions);

export default router;