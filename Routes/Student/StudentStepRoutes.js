// Routes/Student/StudentStepRoutes.js
import express from "express";
import { upload, uploadMarksheet } from "../../Middleware/Multer.js";
import {
  saveStudentStep,
  getStudentStep,
  getStudentProfile,
  getMyApplications,
  getSingleApplication,
} from "../../Controllers/Student/StudentStepController.js";
import { protectStudent } from "../../Middleware/studentAuth.js";

const router = express.Router();

router.use(protectStudent);

/* STEP 1 — Personal Info (with profile image) */
router.post(
  "/step/1",
  upload.single("profileImage"),
  (req, res, next) => {
    req.params.step = "1";
    next();
  },
  saveStudentStep
);

/* STEP 2 — Family Info */
router.post(
  "/step/2",
  (req, res, next) => {
    req.params.step = "2";
    next();
  },
  saveStudentStep
);

/* STEP 3 — Education (with marksheets) */
router.post(
  "/step/3",
  uploadMarksheet.any(),
  (req, res, next) => {
    req.params.step = "3";
    next();
  },
  saveStudentStep
);

/* STEP 4 — Apply Here */
router.post(
  "/step/4",
  (req, res, next) => {
    req.params.step = "4";
    next();
  },
  saveStudentStep
);

/* GET routes */
router.get("/profile", getStudentProfile);
router.get("/my-applications", getMyApplications);
router.get("/application/:appId", getSingleApplication);
router.get("/step/:step", getStudentStep);

export default router;