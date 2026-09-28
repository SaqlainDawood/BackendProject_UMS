import mongoose from "mongoose";
const teacherAssignmentSchema = new mongoose.Schema(
  {
    semesterSubjectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "SemesterSubject",
      required: true,
      index: true,
    },
    teacherId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Teacher",
      required: true,
      index: true,
    },
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
    assignedAt: { type: Date, default: Date.now },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

teacherAssignmentSchema.index(
  { semesterSubjectId: 1, batchId: 1, sessionId: 1 },
  { unique: true }
);

const TeacherAssignment =
  mongoose.models.TeacherAssignment ||
  mongoose.model("TeacherAssignment", teacherAssignmentSchema);
export default TeacherAssignment;