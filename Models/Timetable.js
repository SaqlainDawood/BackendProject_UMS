/**
 * Timetable.js
 *
 * Ek row = ek period assignment:
 *   Batch X ki Session Y mein, Semester Z ke subject S,
 *   teacher T, room R ko day D ke period P par padhana hai.
 *
 * Conflict Rules (database-level indexes + controller validation):
 *   1. CLASS conflict:    (batchId, sessionId, day, periodNo) unique  → ek class ek waqt mein ek hi subject
 *   2. TEACHER conflict:  (teacherId, sessionId, day, periodNo) unique → teacher poori session mein kisi bhi batch par same time free hona chahiye
 *   3. ROOM conflict:     (roomId, sessionId, day, periodNo) unique    → ek room ek waqt mein ek hi class
 */
import mongoose from "mongoose";

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

const timetableSchema = new mongoose.Schema(
  {
    batchId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Batch",
      required: true,
      index: true,
    },
    sessionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Session",
      required: true,
      index: true,
    },
    semesterNo: {
      type: Number,
      required: true,
      min: 1,
    },

    // Subject-level info
    semesterSubjectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "SemesterSubject",
      required: true,
      index: true,
    },

    // Assignment link (teacher ko subject ke liye already assign hona chahiye)
    teacherAssignmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "TeacherAssignment",
      required: true,
    },

    // Denormalized for fast conflict queries (populate nahi karna padega)
    teacherId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Teacher",
      required: true,
      index: true,
    },

    // Schedule
    day: {
      type: String,
      enum: DAYS,
      required: true,
    },
    periodNo: {
      type: Number,
      required: true,
      min: 1,
      // TimeSlot.periodNo se match karna chahiye
    },

    // Room
    roomId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Room",
      required: true,
    },

    // Agar admin ne max lecture limit ke baad bhi force add kiya
    isOverride: {
      type: Boolean,
      default: false,
      // Sirf timetable:override permission wala set kar sakta hai
    },

    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

// =====================================================================
// CONFLICT PREVENTION INDEXES
// =====================================================================

// 1. Ek batch ek period par sirf ek subject (class conflict)
timetableSchema.index(
  { batchId: 1, sessionId: 1, day: 1, periodNo: 1 },
  { unique: true, partialFilterExpression: { isActive: true } }
);

// 2. Ek teacher same time par sirf ek jagah (across all batches)
timetableSchema.index(
  { teacherId: 1, sessionId: 1, day: 1, periodNo: 1 },
  { unique: true, partialFilterExpression: { isActive: true } }
);

// 3. Ek room ek period par sirf ek class
timetableSchema.index(
  { roomId: 1, sessionId: 1, day: 1, periodNo: 1 },
  { unique: true, partialFilterExpression: { isActive: true } }
);

// Query optimization indexes
timetableSchema.index({ semesterSubjectId: 1, sessionId: 1 });
timetableSchema.index({ teacherAssignmentId: 1 });

const Timetable =
  mongoose.models.Timetable || mongoose.model("Timetable", timetableSchema);
export default Timetable;
