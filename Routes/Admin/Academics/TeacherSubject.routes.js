import express from "express";
import {
  getDepartmentSubjects,
  assignSubjectToTeacher,
  unassignSubjectFromTeacher,
  getAssignedSubjects,
} from "../../../Controllers/Admin/Academics/TeacherSubject.controller.js";

const router = express.Router();

router.get("/department-subjects/:departmentId", getDepartmentSubjects);
router.post("/", assignSubjectToTeacher);       // body: { teacherId, subjectId }
router.delete("/", unassignSubjectFromTeacher); // body: { teacherId, subjectId }
router.get("/:teacherId", getAssignedSubjects); // MUST be after /department-subjects/:departmentId

export default router;