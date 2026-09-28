import express from "express";
import {
  createTuitionFee,
  getTuitionFees,
  getTuitionFeeById,
  updateTuitionFee,
  deleteTuitionFee,
} from "../../Controllers/Student/student_Enrollments/Tuitionfee.controller.js";
import { authMiddleware } from "../../Middleware/authMiddleware.js";
import { checkPermission } from "../../Middleware/checkPermission.js";

const router = express.Router();

router.use(authMiddleware);

router.post("/", checkPermission("fee:add"), createTuitionFee);
router.get("/", checkPermission("fee:view"), getTuitionFees);
router.get("/:id", checkPermission("fee:view"), getTuitionFeeById);
router.put("/:id", checkPermission("fee:update"), updateTuitionFee);
router.delete("/:id", checkPermission("fee:delete"), deleteTuitionFee);

export default router;