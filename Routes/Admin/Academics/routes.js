import express from "express";
import subjectRoutes from "./Subject.routes.js";
import teacherSubjectRoutes from "./TeacherSubject.routes.js";

const router = express.Router();

router.use("/subjects", subjectRoutes);
router.use("/teacher-subjects", teacherSubjectRoutes);

export default router;