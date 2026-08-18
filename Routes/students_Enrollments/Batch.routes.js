import {
  createBatch,
  getBatches,
  getBatchById,
  getBatchSemesters,
  getNextSession,
  advanceBatch,
  updateBatch,
  deleteBatch,
} from "../../Controllers/Student/student_Enrollments/Batch.controller.js";

const router = express.Router();

router.post("/", createBatch);
router.get("/", getBatches);                        // ?departmentId=&degreeClassId=&shiftId=&status=
router.get("/next-session", getNextSession);          // ?currentSessionId=xxx  ⚠️ /:id se PEHLE
router.get("/:id", getBatchById);
router.get("/:id/semesters", getBatchSemesters);      // completed / current / pending + nextExpectedSession
router.put("/:id/advance", advanceBatch);             // { sessionId } ← ab OPTIONAL hai
router.put("/:id", updateBatch);
router.delete("/:id", deleteBatch);

export default router;