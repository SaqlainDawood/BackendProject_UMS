import mongoose from "mongoose";

const batchSemesterSubjectSchema = new mongoose.Schema(
  {
    batchId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Batch",
      required: [true, "Batch is required"],
    },

    semester: {
      type: Number,
      required: [true, "Semester is required"],
      min: [1, "Semester must be at least 1"],
    },

    subjectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Subject",
      required: [true, "Subject is required"],
    },

    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

batchSemesterSubjectSchema.index(
  {
    batchId: 1,
    semester: 1,
    subjectId: 1,
  },
  {
    unique: true,
  }
);

batchSemesterSubjectSchema.index({
  batchId: 1,
  semester: 1,
});

batchSemesterSubjectSchema.index({
  subjectId: 1,
});
const BatchSemesterSubject =
  mongoose.models.BatchSemesterSubject ||
  mongoose.model(
    "BatchSemesterSubject",
    batchSemesterSubjectSchema
  );

export default BatchSemesterSubject;