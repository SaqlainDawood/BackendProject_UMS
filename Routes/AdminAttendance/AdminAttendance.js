import express from "express";
import {
  createClass,
  deleteClass,
  getAllClasses,
  getSingleClass,
  updateClass,
} from "../../Controllers/Admin/AdminAttendance/CreateClass.js";

const router = express.Router();
router.get("/all", getAllClasses);
router.post("/create", createClass);
router.get("/:id", getSingleClass);
router.put("/:id", updateClass);
router.post("/:id", deleteClass);

export default router;
