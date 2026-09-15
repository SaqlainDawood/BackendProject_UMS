import mongoose from "mongoose";

const StudentActivitySchema = new mongoose.Schema(
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
      default: null,
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

    title: {
      type: String,
      required: true,
      trim: true,
    },

    category: {
      type: String,
      enum: [
        "academic",
        "sports",
        "society",
        "competition",
        "event",
        "workshop",
        "seminar",
        "internship",
        "achievement",
        "other",
      ],
      default: "other",
    },

    description: {
      type: String,
      default: "",
    },

    date: {
      type: Date,
      default: null,
    },

    role: {
      type: String,
      default: "",
    },

    achievement: {
      type: String,
      default: "",
    },

    certificate: {
      url: {
        type: String,
        default: null,
      },

      public_id: {
        type: String,
        default: null,
      },
    },

    status: {
      type: String,
      enum: [
        "participated",
        "completed",
        "winner",
        "runner-up",
        "approved",
      ],
      default: "participated",
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

StudentActivitySchema.index({
  studentId: 1,
  semester: 1,
});

export default mongoose.model(
  "StudentActivity",
  StudentActivitySchema
);