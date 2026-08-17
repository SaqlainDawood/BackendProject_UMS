import mongoose from "mongoose";

const fineTypeSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true, trim: true }, // "Late Payment Fine"
    type: { type: String, enum: ["perDay", "fixed"], required: true },
    amount: { type: Number, required: true }, // perDay: rate | fixed: total fine
  },
  { timestamps: true }
);

const FineType = mongoose.models.FineType || mongoose.model("FineType", fineTypeSchema);
export default FineType;