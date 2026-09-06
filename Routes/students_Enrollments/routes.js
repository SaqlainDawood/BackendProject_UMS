import express from "express";
import campusRoutes from "./Campus.routes.js";
import departmentRoutes from "./Department.routes.js";
import degreeClassRoutes from "./Degreeclass.routes.js";
import shiftRoutes from "./Shift.routes.js";
import sessionRoutes from "./Session.routes.js";
import batchRoutes from "./Batch.routes.js";
import enrollmentRoutes from "./Enrollment.routes.js";
import tuitionFeeRoutes from "./Tuitionfee.routes.js";
import fineTypeRoutes from "./Finetype.routes.js";
import voucherRoutes from "./Voucher.routes.js";
import feeTypeRoutes from "./Feetype.routes.js";

const router = express.Router();


router.use("/campuses", campusRoutes);
router.use("/departments", departmentRoutes);
router.use("/degree-classes", degreeClassRoutes);
router.use("/shifts", shiftRoutes);
router.use("/sessions", sessionRoutes);
router.use("/batches", (await import("./Batch.routes.js")).default);
router.use("/enrollments", enrollmentRoutes);
router.use("/tuition-fees", tuitionFeeRoutes);
router.use("/fine-types", fineTypeRoutes);
router.use("/vouchers", voucherRoutes);
router.use("/fee-type",feeTypeRoutes);



export default router;