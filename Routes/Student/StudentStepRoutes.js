import express from "express";
import { upload, uploadMarksheet } from "../../Middleware/Multer.js";
import {
  saveStudentStep,
  getStudentApplication,
  getStudentStep,
  submitStudentApplication,
} from "../../Controllers/Student/StudentStepController.js";
import { protectStudent } from "../../Middleware/studentAuth.js";
const router = express.Router();
router.use(protectStudent);
router.post(
  "/step/1",
  upload.single("profileImage"),
  (req, res, next) => {
    req.params.step = "1";
    next();
  },
  saveStudentStep
);

router.post(
  "/step/2",
  (req, res, next) => {
    req.params.step = "2";
    next();
  },
  saveStudentStep
);
router.post(
  "/step/3",
  uploadMarksheet.any(),
  (req, res, next) => {
    req.params.step = "3";
    next();
  },
  saveStudentStep
);

router.post(
  "/step/4",
  (req, res, next) => {
    req.params.step = "4";
    next();
  },
  saveStudentStep
);
router.get("/application", getStudentApplication);
router.get("/step/:step", getStudentStep);
router.post("/submit", submitStudentApplication);

export default router;