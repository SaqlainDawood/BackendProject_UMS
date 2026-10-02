import express from "express";
import {
  getAdminStudentList,
  getAdminStudentById,
  getStudentUserById,
} from "../../Controllers/Admin/StudentAdminController.js";
import { authMiddleware } from "../../Middleware/authMiddleware.js";
import { checkPermission } from "../../Middleware/checkPermission.js";

const router = express.Router();

router.use(authMiddleware);

router.get("/students", checkPermission("student:view"), getAdminStudentList);
router.get("/students/:userId", checkPermission("student:view"), getStudentUserById);
router.get("/stats/students/all", checkPermission("student:view"), getAdminStudentList);
router.get("/student/view/:id", checkPermission("student:view"), getAdminStudentById);
router.get("/student/:id", checkPermission("student:view"), getAdminStudentById);

export default router;
