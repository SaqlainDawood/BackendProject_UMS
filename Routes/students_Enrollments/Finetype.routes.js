import express from "express";
import {
  createFineType,
  getFineTypes,
  getFineTypeById,
  updateFineType,
  deleteFineType,
} from "../../Controllers/Student/student_Enrollments/Finetype.controller.js";
import { authMiddleware } from "../../Middleware/authMiddleware.js";
import { checkPermission } from "../../Middleware/checkPermission.js";

const router = express.Router();

router.use(authMiddleware);

router.post("/", checkPermission("fee:add"), createFineType);
router.get("/", checkPermission("fee:view"), getFineTypes);
router.get("/:id", checkPermission("fee:view"), getFineTypeById);
router.put("/:id", checkPermission("fee:update"), updateFineType);
router.delete("/:id", checkPermission("fee:delete"), deleteFineType);

export default router;