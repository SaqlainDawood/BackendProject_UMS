import mongoose from "mongoose";

const enrollmentSchema = new mongoose.Schema(
  {
    studentId: { type: mongoose.Schema.Types.ObjectId, ref: "Student", required: true },
    batchId: { type: mongoose.Schema.Types.ObjectId, ref: "Batch", required: true },
    status: { type: String, enum: ["active", "completed", "dropped"], default: "active" },
    enrolledAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

// ek student ki ek batch mein sirf ek enrollment ho
enrollmentSchema.index({ studentId: 1, batchId: 1 }, { unique: true });

const Enrollment = mongoose.models.Enrollment || mongoose.model("Enrollment", enrollmentSchema);
export default Enrollment;