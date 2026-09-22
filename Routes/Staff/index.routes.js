// Routes/Staff/index.js
import express from "express";
import staffAuthRoutes from "./StaffAuth.routes.js";
import staffStepRoutes from "./StaffStep.routes.js";
import staffAdminRoutes from "./StaffAdmin.routes.js";

const router = express.Router();

router.use("/", staffAuthRoutes);

// ✅ Admin routes MUST be mounted before staffStepRoutes.
// staffStepRoutes applies `router.use(protectStaff)` with no path,
// which runs for every request that reaches that router — including
// /admin/* requests — before Express ever gets to staffAdminRoutes.
router.use("/admin", staffAdminRoutes);

router.use("/", staffStepRoutes);

export default router;