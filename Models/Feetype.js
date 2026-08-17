import mongoose from "mongoose";

const feeTypeSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true, trim: true }, // "Transport", "Hostel"
    amount: { type: Number, required: true },
  },
  { timestamps: true }
);

const FeeType = mongoose.models.FeeType || mongoose.model("FeeType", feeTypeSchema);
export default FeeType;