import express from "express";
import {
  getAllStudentUsers,
  getStudentUserById,
} from "../../Controllers/Admin/StudentAdminController.js";
import { protect } from "../../Middleware/authMiddleware.js"; 
import { checkPermission } from "../../middlewares/permissionMiddleware.js"; 
const router = express.Router();

router.use(protect);

router.get("/", checkPermission("student:view"), getAllStudentUsers);
router.get("/:userId", checkPermission("student:view"), getStudentUserById);

export default router;