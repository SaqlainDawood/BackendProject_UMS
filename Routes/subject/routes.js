import  Subject from "../.../../subject/Subject.routes.js";
import express from "express";

const router = express.Router();

router.use("/subjects", Subject);

export default router;

