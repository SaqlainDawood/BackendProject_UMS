import express from "express";
import subjectRoutes from "./Subject.routes.js";
import teacherSubjectRoutes from "./TeacherSubject.routes.js";
import batchSemesterSubjectRoutes from "./BatchSemesterSubject.routes.js";
import studentSemesterRoutes from "./StudentSemester.routes.js";

const router = express.Router();

router.use("/subjects", subjectRoutes);
router.use("/teacher-subjects", teacherSubjectRoutes);
router.use("/batch-semester-subjects", batchSemesterSubjectRoutes);
router.use("/student-semesters", studentSemesterRoutes);

export default router;