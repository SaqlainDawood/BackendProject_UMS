import express from "express";
import { authMiddleware } from "../../Middleware/authMiddleware.js";
import { getAdminDashboardStats } from "../../Controllers/Admin/dashboardStats.controller.js";

const router = express.Router();

router.get("/stats", authMiddleware, getAdminDashboardStats);
router.get("/stats/total-students", authMiddleware, getAdminDashboardStats);

export default router;
