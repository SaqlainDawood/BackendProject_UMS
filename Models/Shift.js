import mongoose from "mongoose";
const shiftSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true }, 
    degreeClassId: { type: mongoose.Schema.Types.ObjectId, ref: "DegreeClass", required: true },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

shiftSchema.index({ degreeClassId: 1, name: 1 }, { unique: true });
const Shift = mongoose.models.Shift || mongoose.model("Shift", shiftSchema);
export default Shift;