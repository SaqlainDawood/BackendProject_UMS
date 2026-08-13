import mongoose from "mongoose";

const batchSemesterLogSchema = new mongoose.Schema(
  {
    batchId: { type: mongoose.Schema.Types.ObjectId, ref: "Batch", required: true },
    sessionId: { type: mongoose.Schema.Types.ObjectId, ref: "Session", required: true },
    semester: { type: Number, required: true },
  },
  { timestamps: true }
);

batchSemesterLogSchema.index({ batchId: 1, sessionId: 1 }, { unique: true });

const BatchSemesterLog =
  mongoose.models.BatchSemesterLog || mongoose.model("BatchSemesterLog", batchSemesterLogSchema);
export default BatchSemesterLog;