import express from "express";
import {
  createClass,
  getAllClasses,
  getSingleClass,

} from "../../Controllers/Admin/AdminClassCRUD/AdminClassCRUD.js";
import { getTeacherSchedule } from "../../Controllers/Admin/TeacherSchedule/TecherSchedule.js";

const router = express.Router();
router.get("/all", getAllClasses);
router.get("/faculty/:teacherId/schedule", getTeacherSchedule);
router.post("/create", createClass);
router.get("/:id", getSingleClass);
// router.put("/:id", updateClass);
// router.delete("/:id", deleteClass);

export default router;
