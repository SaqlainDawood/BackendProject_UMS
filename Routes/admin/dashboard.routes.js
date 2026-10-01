import express from "express";
import { protectAdmin } from "../../Middleware/adminAuth.js";
import { getAdminDashboardStats } from "../../Controllers/Admin/dashboardStats.controller.js";

const router = express.Router();

router.get("/stats", protectAdmin, getAdminDashboardStats);
router.get("/stats/total-students", protectAdmin, getAdminDashboardStats);

export default router;
