// Routes/CMS/index.js
import express from "express";
import roleRoutes from "./roleRoutes.js";
import permissionRoutes from "./permissionRoutes.js";
import userRoleRoutes from "./userRoleRoutes.js";
import jobPostRoutes from "./JobPost.routes.js";

const router = express.Router();

router.use("/roles", roleRoutes);
router.use("/permissions", permissionRoutes);
router.use("/users", userRoleRoutes);
router.use("/job-posts", jobPostRoutes);

export default router;