// Routes/Admin/JobPostRoutes.js
import express from "express";
import {
  createJobPost,
  getAllJobPosts,
  getJobPostById,
  updateJobPost,
  changeJobPostStatus,
  deleteJobPost,
  getJobPostStats,
} from "../../Controllers/CMS/jobPost.controller.js";
import { authMiddleware } from "../../Middleware/authMiddleware.js";
import { checkPermission } from "../../Middleware/checkPermission.js";
const router = express.Router();
router.use(authMiddleware);
router.get("/stats", checkPermission("jobpost:view"), getJobPostStats);

router.post("/", checkPermission("jobpost:create"), createJobPost);

router.get("/", checkPermission("jobpost:view"), getAllJobPosts);

router.get("/:id", checkPermission("jobpost:view"), getJobPostById);

router.put("/:id", checkPermission("jobpost:update"), updateJobPost);
router.patch(
  "/:id/status",
  checkPermission("jobpost:update"),
  changeJobPostStatus
);
router.delete("/:id", checkPermission("jobpost:delete"), deleteJobPost);

export default router;