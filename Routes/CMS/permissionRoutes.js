// Routes/CMS/permissionRoutes.js
import express from "express";
import {
  getAllPermissions,
  getPermissionsGrouped,
  getPermissionById,
} from "../../Controllers/CMS/permissionController.js";
import { authMiddleware } from "../../Middleware/authMiddleware.js";
import { checkPermission } from "../../Middleware/checkPermission.js";

const router = express.Router();

router.use(authMiddleware);

router.get("/", checkPermission("permission:view"), getAllPermissions);
router.get("/grouped", checkPermission("permission:view"), getPermissionsGrouped); 
router.get("/:id", checkPermission("permission:view"), getPermissionById);

export default router;