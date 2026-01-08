import express from "express";
import { upload, uploadMarksheet } from "../Middleware/Multer.js";
import {
  step1Create,
  step2Update,
  step3Update,
  step4Update,
  getStudent,
  studentLogin,
  StudentCredentials,
  studentProfile
} from "../Controllers/Student/StudentController.js";
import { protect } from "../Middleware/authMiddleware.js";
const router = express.Router();
// Student Registration
// Step1: use upload.single('profileImage')
router.post("/step1", upload.single("profileImage"), step1Create);

// Step2:
router.post("/step2/:id", step2Update);

router.post(
  "/step3/:studentId",
  uploadMarksheet.any("marksheet"), // any() bhi chalega, but single fieldname pass karo to best
  step3Update
);

// Step4:
router.post("/step4/:id", step4Update);

// student credentials Register with password
router.post("/set-credentials", StudentCredentials);
// Student Login Route

router.post("/login", studentLogin);

router.get("/me", protect, studentProfile);

// Get student:
router.get("/:id", protect, getStudent);
export default router;
