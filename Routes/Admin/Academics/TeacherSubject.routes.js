import express from "express";

import {
  createTeacherSubject,
  getAllTeacherSubjects,
  getTeacherSubjectById,
  getTeacherSubjects,
  getTeacherClasses,
  getTeacherBatches,
  getTeacherBatchSemesters,
  getTeacherSubjectsByBatch,
  getTeacherSubjectsByBatchSemester,
  getTeacherStudentsByBatchSemester,
  updateTeacherSubject,
  deleteTeacherSubject,
} from "../../../Controllers/Admin/Academics/TeacherSubject.controller.js";


const router = express.Router();
router.get("/", getAllTeacherSubjects);
router.post("/", createTeacherSubject);

router.get( "/teacher/:teacherId", getTeacherSubjects);
router.get("/teacher/:teacherId/classes",getTeacherClasses);
router.get("/teacher/:teacherId/batches",getTeacherBatches);
router.get("/teacher/:teacherId/batch/:batchId/semesters",getTeacherBatchSemesters);
router.get("/teacher/:teacherId/batch/:batchId",getTeacherSubjectsByBatch);
router.get("/teacher/:teacherId/batch/:batchId/semester/:semester",getTeacherSubjectsByBatchSemester);
router.get("/teacher/:teacherId/batch/:batchId/semester/:semester/students",getTeacherStudentsByBatchSemester);
router.get("/:id",getTeacherSubjectById);
router.put( "/:id",updateTeacherSubject);
router.delete("/:id",  deleteTeacherSubject);
export default router;