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

// ek DegreeClass+Shift+StartSession combination ki sirf ek Batch ho.
// departmentId ab identity mein shamil nahi kyunke wo hamesha degreeClassId se
// hi derive hota hai (ek DegreeClass hamesha ek hi Department ki hoti hai),
// isliye alag se check karne ki zarurat nahi.
batchSchema.index({ degreeClassId: 1, shiftId: 1, startSessionId: 1 }, { unique: true });

/*
  VIRTUAL: name
  Derived from populated degreeClassId.code + startSessionId.year, e.g. "BSCS-2026".
  Nothing stored in DB — always stays in sync, no migration needed.
  Only resolves when degreeClassId and startSessionId are populated;
  falls back to null otherwise (e.g. on lean/unpopulated queries).
*/
batchSchema.virtual("name").get(function () {
  const code = this.degreeClassId && this.degreeClassId.code;
  const year = this.startSessionId && this.startSessionId.year;

  if (!code || !year) return null;

  return `${code}-${year}`;
});

const Batch = mongoose.models.Batch || mongoose.model("Batch", batchSchema);
export default Batch;