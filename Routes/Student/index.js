// Routes/Student/index.js
import express from "express";
import studentAuthRoutes from "./StudentAuthRoutes.js";
import studentStepRoutes from "./StudentStepRoutes.js";
import studentApplicationAdminRoutes from "./StudentApplicationAdminRoutes.js";


const router = express.Router();

router.use("/auth/", studentAuthRoutes);
router.use("/steps/", studentStepRoutes);
router.use("/admin/applications/", studentApplicationAdminRoutes);

export default router;