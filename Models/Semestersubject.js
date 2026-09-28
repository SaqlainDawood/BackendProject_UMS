import mongoose from "mongoose";
const semesterSubjectSchema = new mongoose.Schema(
  {
    programSemesterId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ProgramSemester",
      required: true,
      index: true,
    },
    subjectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Subject",
      required: true,
      index: true,
    },
    creditHours: {
      type: Number,
      required: true,
      min: 1,
    },
    subjectType: {
      type: String,
      enum: ["COMPULSORY", "ELECTIVE"],
      default: "COMPULSORY",
    },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

semesterSubjectSchema.index(
  { programSemesterId: 1, subjectId: 1 },
  { unique: true }
);

const SemesterSubject =
  mongoose.models.SemesterSubject ||
  mongoose.model("SemesterSubject", semesterSubjectSchema);
export default SemesterSubject;