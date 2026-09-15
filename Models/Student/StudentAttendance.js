import mongoose from "mongoose";

const StudentAttendanceSchema = new mongoose.Schema(
  {
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Student",
      required: true,
      index: true,
    },

    batchId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Batch",
      required: true,
      index: true,
    },

    semester: {
      type: Number,
      required: true,
      min: 1,
      index: true,
    },

    session: {
      type: String,
      default: "",
    },

    batchSemesterSubjectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "BatchSemesterSubject",
      required: true,
      index: true,
    },

    subjectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Subject",
      required: true,
      index: true,
    },

    teacherId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Teacher",
      default: null,
    },

    date: {
      type: Date,
      required: true,
      index: true,
    },

    status: {
      type: String,
      enum: ["present", "absent", "leave"],
      required: true,
    },

    remarks: {
      type: String,
      default: "",
    },
  },
  {
    timestamps: true,
  }
);

// Same student + same subject + same date duplicate nahi
StudentAttendanceSchema.index(
  {
    studentId: 1,
    batchSemesterSubjectId: 1,
    date: 1,
  },
  {
    unique: true,
  }
);

export default mongoose.model(
  "StudentAttendance",
  StudentAttendanceSchema
);