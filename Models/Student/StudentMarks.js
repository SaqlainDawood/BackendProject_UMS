import mongoose from "mongoose";

const StudentMarksSchema = new mongoose.Schema(
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

    marks: {
      assignment: {
        obtained: { type: Number, default: 0 },
        total: { type: Number, default: 0 },
      },

      quiz: {
        obtained: { type: Number, default: 0 },
        total: { type: Number, default: 0 },
      },

      midterm: {
        obtained: { type: Number, default: 0 },
        total: { type: Number, default: 0 },
      },

      practical: {
        obtained: { type: Number, default: 0 },
        total: { type: Number, default: 0 },
      },

      final: {
        obtained: { type: Number, default: 0 },
        total: { type: Number, default: 0 },
      },

      totalObtained: {
        type: Number,
        default: 0,
      },

      totalMarks: {
        type: Number,
        default: 0,
      },
    },

    percentage: {
      type: Number,
      default: 0,
    },

    grade: {
      type: String,
      default: null,
    },

    gradePoint: {
      type: Number,
      default: null,
    },

    resultStatus: {
      type: String,
      enum: [
        "pending",
        "pass",
        "fail",
        "incomplete",
        "withdrawn",
      ],
      default: "pending",
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

// Ek subject ka ek semester mein ek marks record
StudentMarksSchema.index(
  {
    studentId: 1,
    semester: 1,
    batchSemesterSubjectId: 1,
  },
  {
    unique: true,
  }
);

export default mongoose.model(
  "StudentMarks",
  StudentMarksSchema
);