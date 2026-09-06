import express from "express";

import {
  createBatch,
  getBatches,
  getBatchById,
  getBatchSemesters,
  getNextSession,
  advanceBatch,
  updateBatch,
  deleteBatch,
  getHierarchy,
} from "../../Controllers/Student/student_Enrollments/Batch.controller.js";

const router = express.Router();

/* CREATE */
router.post("/", createBatch);

/* READ ALL */
router.get("/", getBatches);
router.get( "/next-session", getNextSession
);
router.get( "/hierarchy", getHierarchy
);
router.get( "/:id", getBatchById
);

router.get(  "/:id/semesters", getBatchSemesters
);

router.put( "/:id/advance", advanceBatch
);

/* UPDATE */
router.put( "/:id", updateBatch
);
/* DELETE */
router.delete("/:id", deleteBatch
);

export default router;