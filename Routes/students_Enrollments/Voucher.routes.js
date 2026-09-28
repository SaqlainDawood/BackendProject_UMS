import express from "express";
import {
  createVoucher,
  bulkCreateVoucherForBatch,
  bulkCreateVoucherForDepartment,
  getVouchers,
  getVoucherById,
  getVoucherStatusReport,
  updateVoucherStatus,
  deleteVoucher,
  getStudentVouchers,
} from "../../Controllers/Student/student_Enrollments/Voucher.controller.js";
import { authMiddleware } from "../../Middleware/authMiddleware.js";
import { checkPermission } from "../../Middleware/checkPermission.js";

const router = express.Router();

router.use(authMiddleware);

router.post("/", checkPermission("fee:add"), createVoucher);
router.post("/bulk/batch", checkPermission("fee:add"), bulkCreateVoucherForBatch);
router.post("/bulk/department", checkPermission("fee:add"), bulkCreateVoucherForDepartment);
router.get("/", checkPermission("fee:view"), getVouchers);
router.get("/report", checkPermission("fee:view"), getVoucherStatusReport);
router.get("/:id", checkPermission("fee:view"), getVoucherById);
router.put("/student/:studentId/status", checkPermission("fee:update"), updateVoucherStatus);
router.delete("/:id", checkPermission("fee:delete"), deleteVoucher);
router.get("/student/:studentId", getStudentVouchers); 
export default router;