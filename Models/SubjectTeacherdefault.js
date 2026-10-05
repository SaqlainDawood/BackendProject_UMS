import mongoose from "mongoose";
const schema = new mongoose.Schema(
  {
    degreeClassId: { type: mongoose.Schema.Types.ObjectId, ref: "DegreeClass", required: true },
    subjectId: { type: mongoose.Schema.Types.ObjectId, ref: "Subject", required: true },
    teacherId: { type: mongoose.Schema.Types.ObjectId, ref: "Teacher", required: true },
  },
  { timestamps: true }
);

schema.index({ degreeClassId: 1, subjectId: 1 }, { unique: true });

export default mongoose.model("SubjectTeacherDefault", schema);