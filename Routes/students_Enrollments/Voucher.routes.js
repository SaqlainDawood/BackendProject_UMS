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
} from "../../Controllers/Student/student_Enrollments/Voucher.controller.js";

const router = express.Router();

router.post("/", createVoucher);
router.post("/bulk/batch", bulkCreateVoucherForBatch);           // poori class/batch ke liye
router.post("/bulk/department", bulkCreateVoucherForDepartment); // poore department ke liye
router.get("/", getVouchers);                    // ?studentId= or ?enrollmentId=&semester=&payStatus=
router.get("/report", getVoucherStatusReport);    // ?batchId=&semester=  ⚠️ /:id se PEHLE
router.get("/:id", getVoucherById);
router.put("/:id/status", updateVoucherStatus);   // { payStatus: "paid" }
router.delete("/:id", deleteVoucher);

export default router;