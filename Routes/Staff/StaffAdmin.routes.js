// Routes/Staff/StaffAdminRoutes.js
import express from "express";
import {
  getAllStaffApplications,
  getStaffById,
  approveStaffApplication,
  rejectStaffApplication,
  getStaffStats,
  deleteStaffApplication,
} from "../../Controllers/Staff/StaffAdmin.controller.js"; 
import { authMiddleware } from "../../Middleware/authMiddleware.js";
import { checkPermission } from "../../Middleware/checkPermission.js";

const router = express.Router();

router.use(authMiddleware);

/* ---------- STATS first ---------- */
router.get("/stats", checkPermission("staff:view"), getStaffStats);

/* ---------- CRUD ---------- */
router.get("/applications", checkPermission("staff:view"), getAllStaffApplications);
router.get("/:id", checkPermission("staff:view"), getStaffById);
router.patch("/:id/approve", checkPermission("staff:approve"), approveStaffApplication);
router.patch("/:id/reject", checkPermission("staff:approve"), rejectStaffApplication);
router.delete("/:id", checkPermission("staff:delete"), deleteStaffApplication);

export default router;