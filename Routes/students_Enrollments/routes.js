import express from "express";
import departmentRoutes from "./Department.routes.js";
import degreeClassRoutes from "./Degreeclass.routes.js";
import shiftRoutes from "./Shift.routes.js";
import sessionRoutes from "./Session.routes.js";
import batchRoutes from "./Batch.routes.js";

const router = express.Router();


router.use("/departments", departmentRoutes);
router.use("/degree-classes", degreeClassRoutes);
router.use("/shifts", shiftRoutes);
router.use("/sessions", sessionRoutes);
router.use("/batches", (await import("./Batch.routes.js")).default);

export default router;   