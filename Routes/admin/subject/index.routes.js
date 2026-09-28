import express from "express";
import Subject from "./Subject.routes.js"
import ProgramSubject from "./Programsemester.routes.js"
import SemesterSubject from "./Semestersubject.routes.js"

const router = express.Router();

router.use("/subject" , Subject);
router.use("/program-subject",ProgramSubject)
router.use("/semester-subject",SemesterSubject)

export default router;