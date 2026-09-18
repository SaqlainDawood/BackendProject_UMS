import mongoose from "mongoose";

const batchSchema = new mongoose.Schema(
  {
    departmentId: { type: mongoose.Schema.Types.ObjectId, ref: "Department", required: true },
    degreeClassId: { type: mongoose.Schema.Types.ObjectId, ref: "DegreeClass", required: true },
    shiftId: { type: mongoose.Schema.Types.ObjectId, ref: "Shift", required: true },
    startSessionId: { type: mongoose.Schema.Types.ObjectId, ref: "Session", required: true }, // kis session mein shuru hui
    totalSemesters: { type: Number, required: true }, // e.g. 8 (4 year program)
    currentSemester: { type: Number, default: 1 },
    status: { type: String, enum: ["active", "completed"], default: "active" },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

batchSchema.index({ degreeClassId: 1, shiftId: 1, startSessionId: 1 }, { unique: true });

batchSchema.virtual("name").get(function () {
  const code = this.degreeClassId && this.degreeClassId.code;
  const year = this.startSessionId && this.startSessionId.year;
  if (!code || !year) return null;
  return `${code}-${year}`;
});
const Batch = mongoose.models.Batch || mongoose.model("Batch", batchSchema);
export default Batch;