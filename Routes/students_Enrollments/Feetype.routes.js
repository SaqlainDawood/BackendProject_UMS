import express from "express";
import {
  createFeeType,
  getFeeTypes,
  getFeeTypeById,
  updateFeeType,
  deleteFeeType,
} from "../../Controllers/Student/student_Enrollments/Feetype.controller.js";
import { authMiddleware } from "../../Middleware/authMiddleware.js";
import { checkPermission } from "../../Middleware/checkPermission.js";

const router = express.Router();

router.use(authMiddleware);

router.post("/", checkPermission("fee:add"), createFeeType);
router.get("/", checkPermission("fee:view"), getFeeTypes);
router.get("/:id", checkPermission("fee:view"), getFeeTypeById);
router.put("/:id", checkPermission("fee:update"), updateFeeType);
router.delete("/:id", checkPermission("fee:delete"), deleteFeeType);

export default router;