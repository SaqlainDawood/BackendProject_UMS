// Routes/Admin/StudentApplicationAdminRoutes.js
import express from "express";
import {
  getAllApplications,
  getApplicationsGrouped,
  getApplicationById,
  approveApplication,
  rejectApplication,
  getApplicationStats,
} from "../../Controllers/Admin/StudentApplicationAdminController.js";
import { authMiddleware } from "../../Middleware/authMiddleware.js";
import { checkPermission } from "../../Middleware/checkPermission.js";

const router = express.Router();

router.use(authMiddleware);

/* STATS first */
router.get("/stats", checkPermission("studentapplication:view"), getApplicationStats);

/* GROUPED */
router.get("/grouped", checkPermission("studentapplication:view"), getApplicationsGrouped);

/* LIST */
router.get("/", checkPermission("studentapplication:view"), getAllApplications);

/* SINGLE */
router.get("/:id", checkPermission("studentapplication:view"), getApplicationById);

/* APPROVE */
router.patch(
  "/:id/approve",
  checkPermission("studentapplication:approve"),
  approveApplication
);

/* REJECT */
router.patch(
  "/:id/reject",
  checkPermission("studentapplication:reject"),
  rejectApplication
);

export default router;