import express from "express";

import Teacher from "./Teacher.routes.js"
import TeacherAssignment from "./Teacherassignment.routes.js"

const router = express.Router();

router.use("/add-teacher",Teacher);
router.use("/Teacher-assignment",TeacherAssignment);


export default router;