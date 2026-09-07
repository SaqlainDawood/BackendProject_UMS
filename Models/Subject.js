import mongoose from "mongoose";

const subjectSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    code: { type: String, required: true, uppercase: true, trim: true },

    departmentId: { type: mongoose.Schema.Types.ObjectId, ref: "Department", required: true },
    degreeClassId: { type: mongoose.Schema.Types.ObjectId, ref: "DegreeClass", required: true },
    semester: { type: Number, required: true, min: 1 },

    creditHours: { type: Number, default: 3, min: 1, max: 6 },
    shift: {
      type: String,
      enum: ["Morning", "Evening", "Both"],
      required: true,
    },

    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

subjectSchema.index({ degreeClassId: 1, semester: 1, code: 1 }, { unique: true });
subjectSchema.index({ departmentId: 1 });

const Subject = mongoose.models.Subject || mongoose.model("Subject", subjectSchema);
export default Subject;