import express from "express";
import {
  createProgramSemester,
  getSemestersByDegreeClass,
  updateProgramSemester,
  deactivateProgramSemester,
} from "../../../Controllers/Admin/subject/Programsemester.controller.js";
import { authMiddleware } from "../../../Middleware/authMiddleware.js";
import { checkPermission } from "../../../Middleware/checkPermission.js";
const router = express.Router();
router.get("/degree-class/:degreeClassId", getSemestersByDegreeClass);
router.post(
  "/",
  authMiddleware,
  checkPermission("programsemester:create"),
  createProgramSemester
);
router.put(
  "/:id",
  authMiddleware,
  checkPermission("programsemester:update"),
  updateProgramSemester
);
router.patch(
  "/:id/deactivate",
  authMiddleware,
  checkPermission("programsemester:delete"),
  deactivateProgramSemester
);
export default router;