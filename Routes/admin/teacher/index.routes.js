import express from "express";

import Teacher from "./Teacher.routes.js";
import TeacherAssignment from "./Teacherassignment.routes.js";

const router = express.Router();

router.use("/teachers", Teacher);
router.use("/teacher-assignments", TeacherAssignment);

export default router;