// Routes/CMS/roleRoutes.js
import express from "express";
import {
  createRole,
  getAllRoles,
  getRoleById,
  updateRole,
  updateRolePermissions,
  toggleRoleStatus,
  deleteRole,
} from "../../Controllers/CMS/roleController.js";
import { authMiddleware } from "../../Middleware/authMiddleware.js";
import { checkPermission } from "../../Middleware/checkPermission.js";

const router = express.Router();

// All CMS routes require authentication
router.use(authMiddleware);

/* ---------- ROLES ---------- */
router.post("/", checkPermission("role:create"), createRole);
router.get("/", checkPermission("role:view"), getAllRoles);
router.get("/:id", checkPermission("role:view"), getRoleById);
router.put("/:id", checkPermission("role:update"), updateRole);
router.patch("/:id/permissions", checkPermission("role:update"), updateRolePermissions);
router.patch("/:id/toggle", checkPermission("role:update"), toggleRoleStatus);
router.delete("/:id", checkPermission("role:delete"), deleteRole);

export default router;