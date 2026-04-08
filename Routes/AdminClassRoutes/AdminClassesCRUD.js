import express from "express";
import {
  createClass,
  getAllClasses,
  getSingleClass,
  updateClass,
  deleteClass,          
  reactivateClass  
} from "../../Controllers/Admin/AdminClassCRUD/AdminClassCRUD.js";
import { getTeacherSchedule } from "../../Controllers/Admin/TeacherSchedule/TecherSchedule.js";
import { checkTeacherSchedule } from "../../Middleware/checkTeachSchedule.js";

const router = express.Router();
router.get("/all", getAllClasses);
router.get("/faculty/:teacherId/schedule", getTeacherSchedule);
router.post("/create", checkTeacherSchedule, createClass);
router.get("/:id", getSingleClass);
router.put('/update/:id', updateClass);
router.delete('/:id/delete',deleteClass);
router.delete('/:id/permenantly-delete',reactivateClass);
router.patch('/:id/reactive',reactivateClass);

export default router;

