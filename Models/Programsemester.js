import mongoose from "mongoose";
const programSemesterSchema = new mongoose.Schema(
  {
    degreeClassId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "DegreeClass",
      required: true,
      index: true,
    },
    semesterNo: {
      type: Number,
      required: true,
      min: 1,
    },
    name: {
      type: String,
      trim: true,
      default: "",
    },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);
programSemesterSchema.index({ degreeClassId: 1, semesterNo: 1 }, { unique: true });
const ProgramSemester =
  mongoose.models.ProgramSemester ||
  mongoose.model("ProgramSemester", programSemesterSchema);
export default ProgramSemester;