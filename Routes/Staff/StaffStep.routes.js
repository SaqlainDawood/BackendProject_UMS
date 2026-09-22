// Routes/Staff/StaffStepRoutes.js
import express from "express";
import {
  saveStaffStep,
  getStaffStep,
  getStaffApplication,
  submitStaffApplication,
} from "../../Controllers/Staff/StaffStep.controller.js";
import { protectStaff } from "../../Middleware/staffAuth.js";

const router = express.Router();

router.use(protectStaff);

router.post("/step/:step", saveStaffStep);
router.get("/step/:step", getStaffStep);
router.get("/application", getStaffApplication);
router.post("/submit", submitStaffApplication);

export default router;