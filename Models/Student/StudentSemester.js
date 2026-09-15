import mongoose from "mongoose";

const StudentSemesterSchema = new mongoose.Schema(
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

    // Is semester ke tamam subjects
    subjects: [
      {
        batchSemesterSubjectId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "BatchSemesterSubject",
          required: true,
        },

        subjectId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Subject",
          required: true,
        },

        teacherId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Teacher",
          default: null,
        },

        subjectStatus: {
          type: String,
          enum: ["enrolled", "completed", "failed", "withdrawn"],
          default: "enrolled",
        },
      },
    ],

    status: {
      type: String,
      enum: [
        "in-progress",
        "completed",
        "result-pending",
        "withdrawn",
      ],
      default: "in-progress",
      index: true,
    },

    semesterGPA: {
      type: Number,
      default: null,
    },

    totalCreditHours: {
      type: Number,
      default: 0,
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

// Same student ka same semester duplicate nahi hoga
StudentSemesterSchema.index(
  {
    studentId: 1,
    batchId: 1,
    semester: 1,
  },
  {
    unique: true,
  }
);

export default mongoose.model(
  "StudentSemester",
  StudentSemesterSchema
);