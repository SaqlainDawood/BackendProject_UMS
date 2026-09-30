import express from "express";
import Subject from "./Subject.routes.js";
import ProgramSubject from "./Programsemester.routes.js";
import SemesterSubject from "./Semestersubject.routes.js";

const router = express.Router();

router.use("/subjects", Subject);
router.use("/program-semesters", ProgramSubject);
router.use("/semester-subjects", SemesterSubject);

export default router;