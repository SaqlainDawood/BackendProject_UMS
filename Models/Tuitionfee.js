import mongoose from "mongoose";

const tuitionFeeSchema = new mongoose.Schema(
  {
    departmentId: { type: mongoose.Schema.Types.ObjectId, ref: "Department", required: true },
    degreeClassId: { type: mongoose.Schema.Types.ObjectId, ref: "DegreeClass", required: true },
    shiftId: { type: mongoose.Schema.Types.ObjectId, ref: "Shift", required: true },
    amount: { type: Number, required: true },
  },
  { timestamps: true }
);

tuitionFeeSchema.index({ departmentId: 1, degreeClassId: 1, shiftId: 1 }, { unique: true });

const TuitionFee = mongoose.models.TuitionFee || mongoose.model("TuitionFee", tuitionFeeSchema);
export default TuitionFee;