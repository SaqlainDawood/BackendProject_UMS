import express from "express";
import studentAuthRoutes from "./StudentAuthRoutes.js";
import studentStepRoutes from "./StudentStepRoutes.js";

const router = express.Router();

router.use("/", studentAuthRoutes);
router.use("/", studentStepRoutes);

export default router;